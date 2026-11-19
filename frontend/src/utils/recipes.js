// ==========================================================================
// Constantes et fonctions utilitaires partagées (portées depuis js/app.js)
// ==========================================================================

export const API_ORIGIN = 'http://localhost:3000'
export const API_URL = `${API_ORIGIN}/api`

// Units available for ingredients ('' = "to taste", no quantity needed)
export const UNITS = [
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'pcs', label: 'pcs' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'tsp', label: 'tsp' },
  { value: '', label: 'to taste' }
]

// Basic ingredients: assumed to be available, so the pantry never asks about them.
export const BASIC_INGREDIENTS = ['water', 'salt', 'black pepper', 'olive oil', 'vegetable oil']

// Ingredients are matched by name (case-insensitive) between pantry and recipes
export const ingredientKey = (name) => name.trim().toLowerCase()

// Picture shown when a recipe has no image (or when none of its images can be loaded)
export const DEFAULT_IMAGE = '/default-recipe.jpg'
// Maximum number of pictures per recipe
export const MAX_IMAGES = 6

// Images importées : le serveur renvoie un chemin /img/..., servi par le backend
export const imgSrc = (src) => (src && src.startsWith('/img/') ? API_ORIGIN + src : src)

export const CATEGORIES = [
  { value: '', label: 'All', emoji: '' },
  { value: 'Starter', label: 'Starters', emoji: '🥗' },
  { value: 'Main', label: 'Mains', emoji: '🍝' },
  { value: 'Dessert', label: 'Desserts', emoji: '🍰' },
  { value: 'Quick', label: 'Quick', emoji: '⚡' }
]

// Blank state of the create/edit recipe form
export const emptyRecipeForm = () => ({
  title: '',
  category: 'Main',
  prepTime: 25,
  images: [],
  videoUrl: '',
  ingredients: [{ name: '', quantity: '', unit: 'g' }],
  instructions: ''
})

// Reads an image file chosen by the user and returns a smaller JPEG as a data URL
// (longest side 1000 px), so imported pictures stay light.
export function resizeImage(file, maxSize = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not decode the image'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff' // transparent PNGs get a white background
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// ----- Formatting -----
export const formatIngredient = (ing) => {
  if (!ing.unit || ing.quantity === null || ing.quantity === '') return `${ing.name} (to taste)`
  if (ing.unit === 'pcs') return `${ing.quantity} × ${ing.name}`
  return `${ing.quantity} ${ing.unit} ${ing.name}`
}

// Instructions are stored as text, one step per line
export const instructionSteps = (text) => {
  if (!text) return []
  return text.split('\n').map(step => step.trim()).filter(step => step.length > 0)
}

export const formatDateTime = (iso, withSeconds = false) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined
  })

export const timeAgo = (iso) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  if (days < 30) { const w = Math.floor(days / 7); return `${w} week${w > 1 ? 's' : ''} ago` }
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}

export const recipeTimeLabel = (recipe, withSeconds = false) => {
  if (recipe.shared && recipe.sharedAt) {
    return `Shared ${formatDateTime(recipe.sharedAt, withSeconds)} · ${timeAgo(recipe.sharedAt)}`
  }
  return `Private · created ${formatDateTime(recipe.createdAt, withSeconds)}`
}
