<template>
  <!-- Recipe detail window -->
  <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center gap-3 p-4" @mousedown.self="$emit('close')">
    <!-- Previous recipe (large screens; small screens use the bar at the bottom of the window) -->
    <button type="button" @click="$emit('navigate', previous)" :disabled="!previous" class="recipe-nav hidden md:flex items-center justify-center" aria-label="Previous recipe" :title="previous ? 'Previous: ' + previous.title : 'This is the first recipe'">
      <i class="fa-solid fa-chevron-left"></i>
    </button>

    <div ref="modalEl" class="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" role="dialog" aria-modal="true" :aria-label="recipe.title">
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
                <span class="text-amber-500 font-bold"><i class="fa-solid fa-star mr-1"></i> {{ rev.rating }}/5</span>
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import RecipeCarousel from './RecipeCarousel.vue'
import { useRecipes } from '../composables/useRecipes'
import { usePantry } from '../composables/usePantry'
import { useUI } from '../composables/useUI'
import { useAuth } from '../composables/useAuth'
import { formatIngredient, instructionSteps, recipeTimeLabel } from '../utils/recipes'

const props = defineProps({
  recipe: { type: Object, required: true },
  previous: { type: Object, default: null },
  next: { type: Object, default: null },
  index: { type: Number, default: -1 },
  total: { type: Number, default: 0 }
})
const emit = defineEmits(['close', 'navigate'])

const { ratingText, totalFavorites, addReview } = useRecipes()
const {
  pantryCount, pantryMatch, ingredientStatus, rowClass, statusIcon, statusLabel,
  recipeMissingCount, addAllMissing, addToPantry, addQuantity, setAddQuantity, resetAddQuantities
} = usePantry()
const { showFormModal, showAuthModal, openAuth } = useUI()
const { isLoggedIn } = useAuth()

const modalEl = ref(null)
const match = computed(() => pantryMatch(props.recipe))

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
  if (modalEl.value) modalEl.value.scrollTop = 0
}, { immediate: true })

// Left / right arrow keys move to the previous / next recipe; Escape closes the window
const onKeydown = (event) => {
  if (showFormModal.value || showAuthModal.value) return
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
