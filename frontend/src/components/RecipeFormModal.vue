<template>
  <!-- Create / Edit Recipe window -->
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative" role="dialog" aria-modal="true" aria-labelledby="form-title">
      <button @click="closeForm" class="modal-close absolute top-4 right-4 !bg-amber-100" aria-label="Close">
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>

      <h3 id="form-title" class="text-2xl font-bold text-slate-900 mb-6">
        {{ editingId ? 'Edit recipe' : 'Publish a new recipe' }}
      </h3>

      <form @submit.prevent="save" class="space-y-4">
        <ul v-if="formErrors.length" role="alert" class="alert-error">
          <li v-for="(msg, i) in formErrors" :key="i">{{ msg }}</li>
        </ul>

        <div>
          <label class="field-label" for="rf-title">Recipe title *</label>
          <input id="rf-title" v-model="form.title" required type="text" placeholder="E.g. Traditional moussaka" class="field">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="field-label" for="rf-category">Category</label>
            <select id="rf-category" v-model="form.category" class="field">
              <option value="Starter">Starter</option>
              <option value="Main">Main Course</option>
              <option value="Dessert">Dessert</option>
            </select>
          </div>
          <div>
            <label class="field-label" for="rf-time">Prep time (minutes) *</label>
            <input id="rf-time" v-model.number="form.prepTime" required type="number" min="1" placeholder="30" class="field">
          </div>
        </div>

        <div>
          <label class="field-label">Images (optional)</label>
          <div class="tip">
            <i class="fa-regular fa-lightbulb text-brand-500 mt-0.5"></i>
            <p>
              <strong>Tip:</strong> find a free photo on
              <a href="https://unsplash.com" target="_blank" rel="noopener" class="font-bold text-brand-700 underline hover:text-brand-800">unsplash.com <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i></a>,
              right-click it, choose <em>“Copy image address”</em> and paste the link below.
            </p>
          </div>

          <div class="flex gap-2 mt-3">
            <input v-model="imageLinkInput" @keydown.enter.prevent="addImageLink" type="url" placeholder="https://images.unsplash.com/photo-..." aria-label="Image link" class="field field-sm flex-1 min-w-0">
            <button type="button" @click="addImageLink" class="btn btn-secondary btn-sm"><i class="fa-solid fa-link"></i> Add link</button>
          </div>
          <p class="text-xs text-slate-500 mt-2">{{ form.images.length }} / {{ MAX_IMAGES }} images</p>
          <p v-if="imageError" role="alert" class="text-xs font-semibold text-rose-600 mt-2">{{ imageError }}</p>

          <ul v-if="form.images.length" class="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
            <li v-for="(src, idx) in form.images" :key="idx" class="thumb">
              <img :src="imgSrc(src)" alt="" @error="onThumbError">
              <span v-if="idx === 0" class="thumb-badge">Cover</span>
              <button type="button" @click="removeFormImage(idx)" class="thumb-remove" aria-label="Remove this image"><i class="fa-solid fa-xmark"></i></button>
            </li>
          </ul>
        </div>

        <div>
          <label class="field-label" for="rf-video">Video link (optional)</label>
          <div class="relative">
            <i class="fa-brands fa-youtube absolute left-4 top-3.5 text-slate-400"></i>
            <input id="rf-video" v-model="form.videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." class="field pl-11">
          </div>
          <p class="text-xs text-slate-500 mt-1">A link to a video of the recipe (YouTube, Vimeo or any other site). You can always watch it; other people need Gourmet Plus.</p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="field-label mb-0">Ingredients *</label>
            <button type="button" @click="addIngredientRow" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-plus"></i> Add ingredient
            </button>
          </div>
          <datalist id="known-ingredients">
            <option v-for="item in ingredientCatalog" :key="item.key" :value="item.name"></option>
          </datalist>
          <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
            <div v-for="(row, idx) in form.ingredients" :key="idx" class="flex items-center gap-2">
              <input v-model="row.name" list="known-ingredients" @change="onIngredientNameChange(row)" type="text" placeholder="e.g. flour" aria-label="Ingredient name" class="field field-sm flex-1 min-w-0">
              <input v-model.number="row.quantity" :disabled="!row.unit" type="number" min="0" step="any" placeholder="Qty" aria-label="Quantity" class="field field-sm w-20">
              <select v-model="row.unit" aria-label="Unit" class="field field-sm w-24">
                <option v-for="u in UNITS" :key="u.value" :value="u.value">{{ u.label }}</option>
              </select>
              <button type="button" @click="removeIngredientRow(idx)" :disabled="form.ingredients.length === 1" title="Remove ingredient" aria-label="Remove ingredient" class="btn btn-danger btn-icon btn-sm">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        </div>

        <div>
          <label class="field-label" for="rf-steps">Preparation steps (one per line) *</label>
          <textarea id="rf-steps" v-model="form.instructions" required rows="4" placeholder="Preheat the oven to 180°C&#10;Mix the flour and the eggs&#10;Bake for 30 minutes" class="field"></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-orange-100">
          <button type="button" @click="closeForm" class="btn btn-secondary btn-lg">Cancel</button>
          <button type="submit" :disabled="saving" class="btn btn-primary btn-lg">
            <i :class="saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-floppy-disk'"></i> {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipes } from '../composables/useRecipes'
import { usePantry } from '../composables/usePantry'
import { useUI } from '../composables/useUI'
import { useImages } from '../composables/useImages'
import {
  UNITS, MAX_IMAGES, emptyRecipeForm, ingredientKey, instructionSteps, imgSrc
} from '../utils/recipes'

const router = useRouter()
const { saveRecipe } = useRecipes()
const { ingredientCatalog, unitByKey } = usePantry()
const { editingRecipe, closeForm } = useUI()
const { onThumbError } = useImages()

// The window is created each time it opens: the form starts from the recipe being edited (or blank)
const editingId = editingRecipe.value ? editingRecipe.value.id : null
const form = reactive(editingRecipe.value
  ? {
      title: editingRecipe.value.title,
      category: editingRecipe.value.category === 'Quick' ? 'Main' : editingRecipe.value.category,   // « Quick » n'est plus une catégorie
      prepTime: editingRecipe.value.prepTime,
      images: [...(editingRecipe.value.images || [])],
      videoUrl: editingRecipe.value.videoUrl || '',
      ingredients: editingRecipe.value.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity === null ? '' : ing.quantity,
        unit: ing.unit
      })),
      instructions: editingRecipe.value.instructions
    }
  : emptyRecipeForm())

const formErrors = ref([])
const imageLinkInput = ref('')
const imageError = ref('')
const saving = ref(false)         // true while the recipe is being saved (prevents a double submit)

// ----- Images -----
function addImageLink() {
  const link = imageLinkInput.value.trim()
  imageError.value = ''
  if (!link) return

  let url
  try { url = new URL(link) } catch (e) { url = null }
  if (!url || !['http:', 'https:'].includes(url.protocol)) {
    imageError.value = 'This is not a valid link. It must start with https://'
    return
  }
  // A very common mistake: pasting the address of the Unsplash page instead of the picture
  if (url.hostname.endsWith('unsplash.com') && url.hostname !== 'images.unsplash.com') {
    imageError.value = 'This is the link of the page, not of the picture. Right-click the photo and choose "Copy image address" (it starts with https://images.unsplash.com/).'
    return
  }
  if (form.images.includes(link)) {
    imageError.value = 'This image is already added.'
    return
  }
  if (form.images.length >= MAX_IMAGES) {
    imageError.value = `You can add up to ${MAX_IMAGES} images.`
    return
  }
  form.images.push(link)
  imageLinkInput.value = ''
}

const removeFormImage = (index) => form.images.splice(index, 1)

// ----- Ingredient rows -----
const addIngredientRow = () => form.ingredients.push({ name: '', quantity: '', unit: 'g' })
const removeIngredientRow = (index) => {
  if (form.ingredients.length > 1) form.ingredients.splice(index, 1)
}
// When the name matches a known ingredient, reuse its unit so the pantry filter works
const onIngredientNameChange = (row) => {
  const knownUnit = unitByKey.value[ingredientKey(row.name)]
  if (knownUnit !== undefined) row.unit = knownUnit
}

// ----- Save -----
async function save() {
  if (saving.value) return
  const title = form.title.trim()
  const instructions = instructionSteps(form.instructions).join('\n')
  const ingredients = form.ingredients
    .filter(row => row.name.trim())
    .map(row => ({
      name: ingredientKey(row.name),
      quantity: row.unit ? Number(row.quantity) : null,
      unit: row.unit
    }))

  // Validation
  const errors = []
  if (!title) errors.push('Please enter a recipe title.')
  if (!Number.isInteger(form.prepTime) || form.prepTime < 1) errors.push('Prep time must be a whole number of minutes (1 or more).')
  if (ingredients.length === 0) errors.push('Add at least one ingredient.')
  ingredients.forEach(ing => {
    if (ing.unit && !(ing.quantity > 0)) errors.push(`Enter a quantity for "${ing.name}" (or choose "to taste").`)
  })
  if (!instructions) errors.push('Add at least one preparation step.')
  const videoUrl = (form.videoUrl || '').trim()
  if (videoUrl && !/^https?:\/\/\S+$/i.test(videoUrl)) errors.push('The video link must be a valid address starting with https://')
  if (errors.length > 0) {
    formErrors.value = errors
    return
  }

  saving.value = true
  formErrors.value = []
  try {
    // Pictures are links (images.imageUrl / Recipes.images in the database)
    await saveRecipe({ title, category: form.category, prepTime: form.prepTime, images: [...form.images], videoUrl, ingredients, instructions }, editingId)
    closeForm()
    // New recipes are private ("My Creations") until the author shares them
    if (!editingId) router.push('/my-creations')
  } catch (error) {
    formErrors.value = error.errors || [error.message]
  } finally {
    saving.value = false
  }
}

const onKeydown = (event) => { if (event.key === 'Escape') closeForm() }
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>
