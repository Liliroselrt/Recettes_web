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
      <RecipeCarousel :recipe="recipe" height-class="h-64 sm:h-80 bg-gradient-to-tr from-brand-600 to-brand-500" always-show-arrows count-on-top>
        <span v-if="index >= 0" class="recipe-counter">Recipe {{ index + 1 }} of {{ total }}</span>
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
        <div class="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
          <span class="bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">{{ recipe.category }}</span>
          <h2 class="text-2xl sm:text-4xl font-extrabold mt-2">{{ recipe.title }}</h2>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-200 mt-2">
            <span><i class="fa-regular fa-clock mr-1 text-amber-400"></i> {{ recipe.prepTime }} minutes</span>
            <RouterLink :to="`/users/${recipe.userId}`" class="pointer-events-auto hover:underline" :title="`See the profile of ${recipe.author}`" @click="emit('close')"><i class="fa-solid fa-user mr-1 text-amber-400"></i> {{ recipe.author }}</RouterLink>
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

              <!-- Take this ingredient out of the pantry again -->
              <button v-if="canRemove(ingredient)" type="button" @click="removeFromPantry(ingredient)" class="btn btn-secondary btn-sm ing-remove" :aria-label="'Remove ' + ingredient.name + ' from my pantry'" :title="'Remove ' + ingredient.name + ' from my pantry'">
                <i class="fa-solid fa-minus"></i> Remove
              </button>
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

        <!-- I cooked this: saves the recipe in my history and takes the used quantities out of my pantry -->
        <section class="rounded-2xl border border-brand-100 bg-brand-50/60 p-5" aria-label="Cooked this recipe">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 class="text-lg font-bold text-slate-900 flex items-center">
                <i class="fa-solid fa-utensils text-brand-500 mr-2"></i> Did you cook it?
              </h4>
              <p class="text-xs text-slate-500 mt-1">Keep it in your cooking history and update your pantry.</p>
            </div>
            <button v-if="!cookOpen" type="button" class="btn btn-primary btn-lg" @click="openCook">
              <i class="fa-solid fa-check"></i> I cooked this
            </button>
          </div>

          <p v-if="cookResult && !cookOpen" class="notice notice-ok mt-4" role="status">
            <i class="fa-solid fa-circle-check"></i>
            <span>
              <template v-if="cookResult.saved">Saved in your cooking history.</template>
              <template v-else>Done.</template>
              <template v-if="cookResult.changes.length"> {{ cookResult.changes.length }} ingredient{{ cookResult.changes.length === 1 ? '' : 's' }} taken out of your pantry.</template>
              <RouterLink v-if="cookResult.saved" to="/history" class="font-bold underline ml-1" @click="emit('close')">See my history</RouterLink>
            </span>
          </p>

          <form v-if="cookOpen" @submit.prevent="confirmCooked" class="mt-4 space-y-4">
            <div v-if="cookPlan.length">
              <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" v-model="cookDeduct" class="w-4 h-4 rounded border-slate-300">
                Take these ingredients out of my pantry
              </label>
              <ul v-if="cookDeduct" class="mt-3 space-y-1.5 text-sm text-slate-700">
                <li v-for="change in cookPlan" :key="change.key" class="flex flex-wrap items-center gap-x-2">
                  <span class="first-letter:uppercase font-semibold">{{ change.name }}</span>
                  <span class="text-slate-500">{{ change.before }} {{ change.unit }} <i class="fa-solid fa-arrow-right text-xs mx-1"></i> {{ change.after }} {{ change.unit }}</span>
                  <span v-if="change.runOut" class="tag tag-warn">Used up</span>
                </li>
              </ul>
            </div>
            <p v-else class="text-xs text-slate-500">
              Nothing to take out of your pantry: only ingredients you ticked with a quantity are deducted (basics and "to taste" ingredients never are).
            </p>

            <div v-if="isLoggedIn">
              <label class="field-label" for="cook-note">Note <span class="font-normal text-slate-400">(optional)</span></label>
              <textarea id="cook-note" v-model="cookNote" rows="2" maxlength="300" class="field" placeholder="E.g. Used less sugar, great with vanilla ice cream..."></textarea>
            </div>
            <p v-else class="text-xs text-slate-500"><i class="fa-solid fa-lock mr-1"></i>Log in to also keep this recipe in your cooking history.</p>

            <p v-if="cookError" role="alert" class="text-xs font-semibold text-rose-600">{{ cookError }}</p>
            <div class="flex flex-wrap gap-2">
              <button type="submit" class="btn btn-primary btn-lg" :disabled="cooking">
                <i :class="cooking ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'"></i> Confirm
              </button>
              <button type="button" class="btn btn-secondary btn-lg" @click="cookOpen = false">Cancel</button>
            </div>
          </form>
        </section>

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
          <div v-else class="relative aspect-video min-h-[15rem] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-sm cursor-pointer" role="link" tabindex="0" aria-label="See the Gourmet Plus subscription plans" @click="goToPlans" @keydown.enter.self="goToPlans">
            <img :src="currentImage(recipe)" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-60">
            <div class="absolute inset-0 bg-slate-900/55"></div>
            <div class="relative h-full flex flex-col items-center justify-center gap-2.5 text-center p-4 sm:p-6">
              <span class="w-14 h-14 rounded-full bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/40">
                <i class="fa-solid fa-play text-xl text-white ml-1"></i>
              </span>
              <p class="text-white font-bold text-base sm:text-lg">
                <i class="fa-solid fa-lock text-amber-400 mr-1.5"></i>Watch this recipe being made
              </p>
              <p class="text-slate-200 text-xs sm:text-sm">Unlock the video of every recipe with Gourmet Plus for {{ PLAN.priceLabel }} a month. Cancel anytime. <span class="underline">Click to see the plans.</span></p>
              <div class="flex flex-wrap items-center justify-center gap-2 mt-1">
                <button type="button" class="btn btn-primary btn-sm" @click.stop="unlock">
                  <i class="fa-solid fa-star"></i> Unlock the video · {{ PLAN.priceLabel }}/month
                </button>
                <button type="button" class="btn btn-secondary btn-sm" @click.stop="goToPlans">See what is included</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Reviews & Comments Section -->
        <div class="border-t border-brand-100 pt-6">
          <h4 class="text-lg font-bold text-slate-900 mb-4 flex items-center">
            <i class="fa-solid fa-comments text-brand-500 mr-2"></i> Community reviews ({{ recipe.reviews.length }})
          </h4>

          <!-- Summary -->
          <div v-if="recipe.reviews.length" class="review-summary">
            <span class="review-summary-score">{{ averageRating(recipe).toFixed(1) }}</span>
            <span>
              <span class="block text-amber-400 text-lg leading-none" aria-hidden="true">
                <i v-for="s in 5" :key="s" :class="s <= Math.round(averageRating(recipe)) ? 'fa-solid fa-star' : 'fa-regular fa-star text-slate-300'"></i>
              </span>
              <span class="block text-xs text-slate-500 mt-1">{{ recipe.reviews.length }} review{{ recipe.reviews.length === 1 ? '' : 's' }}</span>
            </span>
          </div>

          <!-- One review per person: write it, then edit it -->
          <p v-if="isRestricted" class="notice notice-warn" role="status">
            <i class="fa-solid fa-ban"></i>
            <span>Your account is suspended: you can no longer post reviews or share recipes.<span v-if="restrictionReason"> Reason: {{ restrictionReason }}</span></span>
          </p>
          <form v-else @submit.prevent="submitReview" class="review-form">
            <label class="field-label">{{ myOwnReview ? 'Your review (you can edit it):' : 'Leave your rating:' }}</label>
            <div class="flex items-center space-x-1 mb-3">
              <button type="button" v-for="star in 5" :key="star" @click="newReviewRating = star" class="star-btn" :aria-label="star + ' star' + (star > 1 ? 's' : '')">
                <i :class="star <= newReviewRating ? 'fa-solid fa-star text-amber-400' : 'fa-regular fa-star text-slate-300'"></i>
              </button>
            </div>
            <textarea v-model="newReviewComment" rows="3" placeholder="E.g. Delicious! I added a pinch of cinnamon..." aria-label="Your review" class="field mb-3"></textarea>
            <p v-if="!isLoggedIn" class="text-xs text-slate-500 mb-2">
              <i class="fa-solid fa-lock mr-1"></i>You need to be logged in to post a review.
            </p>
            <p v-if="reviewError" role="alert" class="text-xs font-semibold text-rose-600 mb-2">{{ reviewError }}</p>
            <p v-if="reviewSaved" role="status" class="text-xs font-semibold text-emerald-700 mb-2"><i class="fa-solid fa-circle-check mr-1"></i>Your review was saved.</p>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="posting">
              <i :class="posting ? 'fa-solid fa-spinner fa-spin' : (myOwnReview ? 'fa-solid fa-pen' : 'fa-solid fa-paper-plane')"></i>
              {{ myOwnReview ? 'Update my review' : 'Post my review' }}
            </button>
          </form>

          <!-- Existing Reviews (mine first) -->
          <ul class="space-y-3 mt-6">
            <li v-for="rev in sortedReviews" :key="rev.id" class="review-card" :class="{ 'review-card-mine': rev.userId === userId }">
              <RouterLink :to="`/users/${rev.userId}`" class="flex-none" :aria-label="'Profile of ' + rev.author" @click="emit('close')">
                <UserAvatar :name="rev.author" :src="rev.authorAvatar" size="md" class="border-2 border-brand-500" />
              </RouterLink>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span class="font-bold text-slate-900 text-sm">
                    <RouterLink :to="`/users/${rev.userId}`" class="hover:text-brand-600 hover:underline" @click="emit('close')">{{ rev.author }}</RouterLink>
                    <span v-if="rev.userId === userId" class="tag ml-1">You</span>
                  </span>
                  <button v-if="rev.userId !== userId" type="button" class="text-slate-400 hover:text-rose-600" :title="'Report this review by ' + rev.author" :aria-label="'Report this review by ' + rev.author" @click="openReviewReport(rev)">
                    <i class="fa-regular fa-flag"></i>
                  </button>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-amber-400 text-sm" :aria-label="rev.rating + ' out of 5'">
                    <i v-for="s in 5" :key="s" :class="s <= rev.rating ? 'fa-solid fa-star' : 'fa-regular fa-star text-slate-300'"></i>
                  </span>
                  <span class="text-xs font-bold text-brand-600">{{ rev.rating }}/5</span>
                </div>
                <p class="text-sm text-slate-700 leading-relaxed mt-2 break-words">{{ rev.comment }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Previous / next recipe (small screens) -->
      <div class="md:hidden sticky bottom-0 z-10 flex gap-3 p-3 bg-white/95 backdrop-blur border-t border-brand-100">
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
import UserAvatar from './UserAvatar.vue'
import FakePaymentModal from './FakePaymentModal.vue'
import ReportModal from './ReportModal.vue'
import { useImages } from '../composables/useImages'
import { useRecipes } from '../composables/useRecipes'
import { usePantry } from '../composables/usePantry'
import { useCooking } from '../composables/useCooking'
import { useUI } from '../composables/useUI'
import { useAuth } from '../composables/useAuth'
import { useRoles } from '../composables/useRoles'
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

const { ratingText, totalFavorites, addReview, isOwner, myReview, averageRating } = useRecipes()
const router = useRouter()
const {
  pantryCount, pantryMatch, ingredientStatus, rowClass, statusIcon, statusLabel,
  recipeMissingCount, addAllMissing, addToPantry, removeFromPantry, canRemove, addQuantity, setAddQuantity, resetAddQuantities, planConsumption
} = usePantry()
const { markCooked } = useCooking()
const { showFormModal, showAuthModal, openAuth } = useUI()
const { isLoggedIn, userId } = useAuth()
const { currentImage } = useImages()
const { isRestricted, restrictionReason } = useRoles()

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

// ----- I cooked this -----
const cookOpen = ref(false)
const cookDeduct = ref(true)
const cookNote = ref('')
const cooking = ref(false)
const cookError = ref('')
const cookResult = ref(null)   // { saved, changes } after a successful confirmation
const cookPlan = computed(() => planConsumption(props.recipe))

function openCook() {
  cookResult.value = null
  cookError.value = ''
  cookDeduct.value = true
  cookOpen.value = true
}
async function confirmCooked() {
  cooking.value = true
  cookError.value = ''
  try {
    cookResult.value = await markCooked(props.recipe, { note: cookNote.value, deductPantry: cookDeduct.value })
    cookOpen.value = false
    cookNote.value = ''
  } catch (e) {
    cookError.value = e.message
  } finally {
    cooking.value = false
  }
}

// ----- Reviews -----
const newReviewRating = ref(5)
const newReviewComment = ref('')
const reviewError = ref('')
const posting = ref(false)
const reviewSaved = ref(false)

// My existing review of this recipe (if any): the form edits it instead of adding another one
const myOwnReview = computed(() => myReview(props.recipe))
const sortedReviews = computed(() =>
  [...props.recipe.reviews].sort((a, b) => (b.userId === userId.value) - (a.userId === userId.value)))
function fillReviewForm() {
  newReviewRating.value = myOwnReview.value ? myOwnReview.value.rating : 5
  newReviewComment.value = myOwnReview.value ? myOwnReview.value.comment : ''
}
// Also refills the form after logging in / out
watch(() => [props.recipe.id, userId.value], fillReviewForm)

async function submitReview() {
  // Reviews need an account: otherwise the log in window opens
  if (!isLoggedIn.value) return openAuth()
  if (!newReviewComment.value.trim()) return
  reviewError.value = ''
  reviewSaved.value = false
  posting.value = true
  try {
    await addReview(props.recipe, newReviewRating.value, newReviewComment.value.trim())
    reviewSaved.value = true
  } catch (e) {
    reviewError.value = e.message
  } finally {
    posting.value = false
  }
}

// A new recipe starts at the top of the window with my review (or a blank form)
watch(() => props.recipe.id, () => {
  resetAddQuantities()
  fillReviewForm()
  cookOpen.value = false
  cookResult.value = null
  cookError.value = ''
  cookNote.value = ''
  reviewError.value = ''
  reviewSaved.value = false
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
