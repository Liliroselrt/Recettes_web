<template>
  <!-- Recipe detail window -->
  <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center gap-3 p-4" @mousedown.self="$emit('close')">
    <!-- Previous recipe (large screens; small screens use the bar at the bottom of the window) -->
    <button type="button" @click="$emit('navigate', previous)" :disabled="!previous" class="recipe-nav hidden md:flex items-center justify-center" aria-label="Previous recipe" :title="previous ? 'Previous: ' + previous.title : 'This is the first recipe'">
      <i class="fa-solid fa-chevron-left"></i>
    </button>

    <div ref="modalEl" class="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" role="dialog" aria-modal="true" :aria-label="recipe.title">
      <!-- Close Button -->
      <button @click="$emit('close')" class="modal-close absolute top-4 right-4 z-10" aria-label="Close">
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>

      <!-- Hero Header -->
      <RecipeCarousel :recipe="recipe" height-class="h-64 sm:h-80 bg-gradient-to-tr from-brand-600 to-amber-500" always-show-arrows count-on-top>
        <span v-if="index >= 0" class="recipe-counter">Recipe {{ index + 1 }} of {{ total }}</span>
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
        <div class="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
          <span class="bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">{{ recipe.category }}</span>
          <h2 class="text-2xl sm:text-4xl font-extrabold mt-2">{{ recipe.title }}</h2>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-200 mt-2">
            <span><i class="fa-regular fa-clock mr-1 text-amber-400"></i> {{ recipe.prepTime }} minutes</span>
            <span><i class="fa-solid fa-user mr-1 text-amber-400"></i> {{ recipe.author }}</span>
            <span><i class="fa-solid fa-star mr-1 text-amber-400"></i> {{ ratingText(recipe) }}</span>
            <span><i class="fa-solid fa-heart mr-1 text-amber-400"></i> {{ totalFavorites(recipe) }}</span>
            <span><i class="fa-regular fa-calendar mr-1 text-amber-400"></i> {{ recipeTimeLabel(recipe, true) }}</span>
          </div>
        </div>
      </RecipeCarousel>

      <!-- Modal Body -->
      <div class="p-6 sm:p-8 space-y-8">
        <p v-if="recipe.isHidden && isMine" class="notice notice-warn" role="status">
          <i class="fa-solid fa-eye-slash"></i>
          <span>This recipe was hidden by the moderators. Only you can see it and it cannot be shared. Open "Reports about me" (flag icon) to read the reason.</span>
        </p>
        <!-- Export the recipe (ingredients, first picture, steps) as a PDF -->
        <div class="flex flex-wrap items-center justify-end gap-3">
          <p v-if="exportError" role="alert" class="text-xs font-semibold text-rose-600">{{ exportError }}</p>
          <button v-if="!isMine" type="button" @click="openReport" class="btn btn-secondary btn-lg" title="Report a problem with this recipe">
            <i class="fa-regular fa-flag"></i> Report
          </button>
          <button type="button" @click="exportPdf" class="btn btn-secondary btn-lg" :disabled="exporting">
            <i :class="exporting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-file-pdf'"></i> Export as PDF
          </button>
        </div>

        <!-- Ingredients List: check = in your pantry, "Add" puts it in your pantry -->
        <div>
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 class="text-lg font-bold text-slate-900 flex items-center">
              <i class="fa-solid fa-basket-shopping text-brand-500 mr-2"></i> Ingredients
            </h4>
            <button v-if="recipeMissingCount(recipe) > 0" @click="addAllMissing(recipe)" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-cart-plus"></i> Add all missing to my pantry
            </button>
          </div>

          <p v-if="pantryCount > 0" class="notice" :class="match.canMake ? 'notice-ok' : 'notice-warn'" role="status">
            <i :class="match.canMake ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
            <span v-if="match.canMake">You have everything you need to cook this recipe!</span>
            <span v-else>You have {{ match.matched }} of {{ match.total }} ingredients.</span>
          </p>

          <ul class="ing-list">
            <li v-for="(ingredient, idx) in recipe.ingredients" :key="idx" class="ing-row" :class="rowClass(ingredient)">
              <span class="ing-icon" aria-hidden="true"><i :class="statusIcon(ingredient)"></i></span>
              <span class="sr-only">{{ statusLabel(ingredient) }}:</span>
              <span class="ing-text">
                {{ formatIngredient(ingredient) }}
                <span v-if="ingredientStatus(ingredient) === 'basic'" class="tag">Basic</span>
                <span v-else-if="ingredientStatus(ingredient) === 'short'" class="tag tag-warn">Not enough</span>
              </span>

              <!-- Add this ingredient (with a quantity) to the pantry -->
              <div v-if="['missing', 'short'].includes(ingredientStatus(ingredient))" class="ing-add">
                <template v-if="ingredient.unit">
                  <input type="number" min="0" step="any" :value="addQuantity(ingredient)" @input="setAddQuantity(ingredient, $event.target.value)" :aria-label="'Quantity of ' + ingredient.name + ' to add'" class="field field-sm w-20 text-right">
                  <span class="text-xs text-slate-500 w-8">{{ ingredient.unit }}</span>
                </template>
                <button type="button" @click="addToPantry(ingredient)" class="btn btn-secondary btn-sm" :aria-label="'Add ' + ingredient.name + ' to my pantry'">
                  <i class="fa-solid fa-plus"></i> {{ ingredient.unit ? 'Add' : 'I have it' }}
                </button>
              </div>
            </li>
          </ul>
        </div>

        <!-- Instructions -->
        <div>
          <h4 class="text-lg font-bold text-slate-900 mb-4 flex items-center">
            <i class="fa-solid fa-list-ol text-brand-500 mr-2"></i> Step-by-step preparation
          </h4>
          <ol class="space-y-4">
            <li v-for="(step, idx) in instructionSteps(recipe.instructions)" :key="idx" class="flex items-start space-x-3">
              <span class="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                {{ idx + 1 }}
              </span>
              <p class="text-slate-700 text-sm leading-relaxed">{{ step }}</p>
            </li>
          </ol>
        </div>

        <!-- Video: played in a frame inside the recipe. Always available to the author (My Creations);
             other people need Gourmet Plus. The server only sends the link when the person may watch it. -->
        <section v-if="recipe.hasVideo" aria-label="Recipe video">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 class="text-lg font-bold text-slate-900 flex items-center">
              <i class="fa-solid fa-circle-play text-brand-500 mr-2"></i> Video
            </h4>
            <span v-if="isMine && safeVideoUrl" class="tag"><i class="fa-solid fa-user-check mr-1"></i> Your video</span>
            <span v-else-if="recipe.isVideoPremium && safeVideoUrl" class="tag"><i class="fa-solid fa-star mr-1"></i> Gourmet Plus</span>
          </div>

          <p v-if="justUnlocked && safeVideoUrl" class="notice notice-ok mb-3" role="status">
            <i class="fa-solid fa-circle-check"></i><span>Gourmet Plus is active. Enjoy the video!</span>
          </p>

          <template v-if="safeVideoUrl">
            <template v-if="embed">
              <div class="aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 shadow-sm">
                <iframe
                  v-if="embed.type === 'iframe'" :key="recipe.id" :src="embed.src" :title="'Video: ' + recipe.title"
                  class="w-full h-full border-0" loading="lazy" allowfullscreen
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin"
                ></iframe>
                <video v-else :key="recipe.id" :src="embed.src" controls preload="metadata" class="w-full h-full"></video>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                Video not playing?
                <a :href="safeVideoUrl" target="_blank" rel="noopener noreferrer" class="font-semibold text-brand-600 hover:underline">Open it on the original site</a>
              </p>
            </template>
            <!-- Site that cannot be shown in a frame: plain link -->
            <a v-else :href="safeVideoUrl" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-circle-play"></i> Watch the video <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
            </a>
          </template>

          <!-- Locked: teaser frame (blurred cover picture). The payment window opens right here and the video appears once paid. -->
          <div v-else class="relative aspect-video min-h-[15rem] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-sm">
            <img :src="currentImage(recipe)" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-60">
            <div class="absolute inset-0 bg-slate-900/55"></div>
            <div class="relative h-full flex flex-col items-center justify-center gap-2.5 text-center p-4 sm:p-6">
              <span class="w-14 h-14 rounded-full bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/40">
                <i class="fa-solid fa-play text-xl text-white ml-1"></i>
              </span>
              <p class="text-white font-bold text-base sm:text-lg">
                <i class="fa-solid fa-lock text-amber-400 mr-1.5"></i>Watch this recipe being made
              </p>
              <p class="text-slate-200 text-xs sm:text-sm">Unlock the video of every recipe with Gourmet Plus for {{ PLAN.priceLabel }} a month. Cancel anytime.</p>
              <div class="flex flex-wrap items-center justify-center gap-2 mt-1">
                <button type="button" class="btn btn-primary btn-sm" @click="unlock">
                  <i class="fa-solid fa-star"></i> Unlock the video · {{ PLAN.priceLabel }}/month
                </button>
                <button type="button" class="btn btn-secondary btn-sm" @click="goToPlans">See what is included</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Reviews & Comments Section -->
        <div class="border-t border-orange-100 pt-6">
          <h4 class="text-lg font-bold text-slate-900 mb-4 flex items-center">
            <i class="fa-solid fa-comments text-brand-500 mr-2"></i> Community reviews ({{ recipe.reviews.length }})
          </h4>

          <!-- Add Review Form -->
          <form @submit.prevent="submitReview" class="bg-amber-50/60 border border-amber-100 p-4 rounded-2xl mb-6">
            <label class="field-label">Leave your rating:</label>
            <div class="flex items-center space-x-1 mb-3">
              <button type="button" v-for="star in 5" :key="star" @click="newReviewRating = star" class="star-btn" :aria-label="star + ' star' + (star > 1 ? 's' : '')">
                <i :class="star <= newReviewRating ? 'fa-solid fa-star text-amber-400' : 'fa-regular fa-star text-slate-300'"></i>
              </button>
            </div>
            <textarea v-model="newReviewComment" rows="2" placeholder="E.g. Delicious! I added a pinch of cinnamon..." aria-label="Your review" class="field mb-3"></textarea>
            <p v-if="!isLoggedIn" class="text-xs text-slate-500 mb-2">
              <i class="fa-solid fa-lock mr-1"></i>You need to be logged in to post a review.
            </p>
            <p v-if="reviewError" role="alert" class="text-xs font-semibold text-rose-600 mb-2">{{ reviewError }}</p>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="posting">
              <i :class="posting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'"></i> Post my review
            </button>
          </form>

          <!-- Existing Reviews -->
          <div class="space-y-3">
            <div v-for="rev in recipe.reviews" :key="rev.id" class="p-3 bg-white border border-orange-100 rounded-xl">
              <div class="flex justify-between items-center text-xs mb-1">
                <span class="font-bold text-slate-800">{{ rev.author }}</span>
                <span class="flex items-center gap-3">
                  <span class="text-amber-500 font-bold"><i class="fa-solid fa-star mr-1"></i> {{ rev.rating }}/5</span>
                  <button v-if="rev.userId !== userId" type="button" class="text-slate-400 hover:text-rose-600" :title="'Report this review by ' + rev.author" :aria-label="'Report this review by ' + rev.author" @click="openReviewReport(rev)">
                    <i class="fa-regular fa-flag"></i>
                  </button>
                </span>
              </div>
              <p class="text-xs text-slate-600">{{ rev.comment }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Previous / next recipe (small screens) -->
      <div class="md:hidden sticky bottom-0 z-10 flex gap-3 p-3 bg-white/95 backdrop-blur border-t border-orange-100">
        <button type="button" @click="$emit('navigate', previous)" :disabled="!previous" class="btn btn-secondary btn-lg flex-1">
          <i class="fa-solid fa-chevron-left"></i> Previous
        </button>
        <button type="button" @click="$emit('navigate', next)" :disabled="!next" class="btn btn-primary btn-lg flex-1">
          Next <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Next recipe (large screens) -->
    <button type="button" @click="$emit('navigate', next)" :disabled="!next" class="recipe-nav hidden md:flex items-center justify-center" aria-label="Next recipe" :title="next ? 'Next: ' + next.title : 'This is the last recipe'">
      <i class="fa-solid fa-chevron-right"></i>
    </button>

    <FakePaymentModal v-if="showPayment" @close="showPayment = false" @paid="onPaid" />
    <ReportModal v-if="reportTarget" :target="reportTarget" @close="reportTarget = null" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import RecipeCarousel from './RecipeCarousel.vue'
import FakePaymentModal from './FakePaymentModal.vue'
import ReportModal from './ReportModal.vue'
import { useImages } from '../composables/useImages'
import { useRecipes } from '../composables/useRecipes'
import { usePantry } from '../composables/usePantry'
import { useUI } from '../composables/useUI'
import { useAuth } from '../composables/useAuth'
import { formatIngredient, instructionSteps, recipeTimeLabel } from '../utils/recipes'
import { exportRecipePdf } from '../utils/exportPdf'
import { useRouter } from 'vue-router'
import { PLAN } from '../composables/useSubscription'

const props = defineProps({
  recipe: { type: Object, required: true },
  previous: { type: Object, default: null },
  next: { type: Object, default: null },
  index: { type: Number, default: -1 },
  total: { type: Number, default: 0 }
})
const emit = defineEmits(['close', 'navigate'])

const { ratingText, totalFavorites, addReview, isOwner } = useRecipes()
const router = useRouter()
const {
  pantryCount, pantryMatch, ingredientStatus, rowClass, statusIcon, statusLabel,
  recipeMissingCount, addAllMissing, addToPantry, addQuantity, setAddQuantity, resetAddQuantities
} = usePantry()
const { showFormModal, showAuthModal, openAuth } = useUI()
const { isLoggedIn, userId } = useAuth()
const { currentImage } = useImages()

const modalEl = ref(null)
const isMine = computed(() => isOwner(props.recipe))
const goToPlans = () => { emit('close'); router.push('/plans') }

// ----- Locked video: pay from here, the video appears in place -----
const showPayment = ref(false)
const justUnlocked = ref(false)
function unlock() {
  if (!isLoggedIn.value) return openAuth()
  showPayment.value = true
}
function onPaid() {
  showPayment.value = false
  justUnlocked.value = true
}

// ----- Reports (recipe, chef or review) -----
const reportTarget = ref(null)
function openReport() {
  if (!isLoggedIn.value) return openAuth()
  reportTarget.value = { type: 'recipe', id: props.recipe.id, kind: 'This recipe', label: props.recipe.title }
}
function openReviewReport(rev) {
  if (!isLoggedIn.value) return openAuth()
  reportTarget.value = { type: 'review', id: rev.id, kind: 'This review', label: `Review by ${rev.author}` }
}
const match = computed(() => pantryMatch(props.recipe))
// Only http(s) links are turned into a clickable link
const safeVideoUrl = computed(() => (/^https?:\/\//i.test(props.recipe.videoUrl || '') ? props.recipe.videoUrl : null))

// Turns a YouTube / Vimeo / direct video link into something that can be played inside the window.
// Any other site returns null (the recipe then shows a plain link instead).
const embed = computed(() => {
  if (!safeVideoUrl.value) return null
  try {
    const url = new URL(safeVideoUrl.value)
    const host = url.hostname.replace(/^www\./, '')
    let id = null
    if (host === 'youtu.be') id = url.pathname.slice(1)
    else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : (url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/) || [])[1]
    }
    if (id && /^[\w-]{6,}$/.test(id)) return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const vimeoId = (url.pathname.match(/(\d{6,})/) || [])[1]
      if (vimeoId) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoId}` }
    }
    if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return { type: 'video', src: safeVideoUrl.value }
  } catch (e) { /* invalid link: no frame */ }
  return null
})

// ----- PDF export -----
const exporting = ref(false)
const exportError = ref('')

async function exportPdf() {
  exporting.value = true
  exportError.value = ''
  try {
    await exportRecipePdf(props.recipe)
  } catch (e) {
    exportError.value = 'Could not create the PDF.'
    console.error(e)
  } finally {
    exporting.value = false
  }
}

// ----- Reviews -----
const newReviewRating = ref(5)
const newReviewComment = ref('')
const reviewError = ref('')
const posting = ref(false)

async function submitReview() {
  // Reviews need an account: otherwise the log in window opens
  if (!isLoggedIn.value) return openAuth()
  if (!newReviewComment.value.trim()) return
  reviewError.value = ''
  posting.value = true
  try {
    await addReview(props.recipe, newReviewRating.value, newReviewComment.value.trim())
    newReviewComment.value = ''
  } catch (e) {
    reviewError.value = e.message
  } finally {
    posting.value = false
  }
}

// A new recipe starts at the top of the window with a blank review form
watch(() => props.recipe.id, () => {
  resetAddQuantities()
  newReviewRating.value = 5
  newReviewComment.value = ''
  reviewError.value = ''
  exportError.value = ''
  justUnlocked.value = false
  showPayment.value = false
  reportTarget.value = null
  if (modalEl.value) modalEl.value.scrollTop = 0
}, { immediate: true })

// Left / right arrow keys move to the previous / next recipe; Escape closes the window
const onKeydown = (event) => {
  if (showFormModal.value || showAuthModal.value || showPayment.value || reportTarget.value) return
  if (event.key === 'Escape') return emit('close')
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return
  if (event.key === 'ArrowLeft' && props.previous) emit('navigate', props.previous)
  if (event.key === 'ArrowRight' && props.next) emit('navigate', props.next)
}
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>
