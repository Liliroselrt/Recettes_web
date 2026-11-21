import { ref, computed, watch } from 'vue'
import { apiFetch } from '../utils/api'
import { useAuth } from './useAuth'

// Toutes les recettes visibles par la personne (partagées + les siennes si connectée)
const recipes = ref([])
const loading = ref(true)
const error = ref('')

const { token, userId, isLoggedIn } = useAuth()

async function fetchRecipes() {
  try {
    recipes.value = await apiFetch('/recipes')
    error.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Connexion / déconnexion : les recettes privées et les favoris changent
watch(token, fetchRecipes)

function replaceRecipe(updated) {
  const index = recipes.value.findIndex(r => r.id === updated.id)
  if (index === -1) recipes.value.unshift(updated)
  else recipes.value[index] = updated
}

export function useRecipes() {
  // ----- Ownership -----
  const isOwner = (recipe) => isLoggedIn.value && recipe.userId === userId.value

  // ----- Favorites -----
  const isFavorite = (recipe) => !!recipe.isFavorite
  const favoriteCount = computed(() => recipes.value.filter(r => r.isFavorite).length)
  // Community favorites (seed) + every favorite recorded on the site, including mine
  const totalFavorites = (recipe) => (recipe.likes || 0) + (recipe.favoritesCount || 0)

  async function toggleFavorite(recipe) {
    const result = await apiFetch(`/recipes/${recipe.id}/favorite`, { method: 'POST' })
    recipe.isFavorite = result.isFavorite
    recipe.favoritesCount = result.favoritesCount
  }

  // ----- Ratings -----
  const averageRating = (recipe) => {
    if (!recipe.reviews || recipe.reviews.length === 0) return null
    return recipe.reviews.reduce((acc, curr) => acc + curr.rating, 0) / recipe.reviews.length
  }
  const ratingLabel = (recipe) => {
    const avg = averageRating(recipe)
    return avg === null ? 'New' : avg.toFixed(1)
  }
  const ratingText = (recipe) => {
    const avg = averageRating(recipe)
    return avg === null ? 'No ratings yet' : `${avg.toFixed(1)} / 5`
  }
  // Comment displayed on the recipe cards
  const latestReview = (recipe) =>
    recipe.reviews && recipe.reviews.length ? recipe.reviews[recipe.reviews.length - 1] : null

  async function addReview(recipe, rating, comment) {
    const { review } = await apiFetch(`/recipes/${recipe.id}/reviews`, {
      method: 'POST',
      body: { rating, comment }
    })
    // One review per person and recipe: the server creates it or updates the existing one
    const index = recipe.reviews.findIndex(r => r.id === review.id || r.userId === review.userId)
    if (index === -1) recipe.reviews.push(review)
    else recipe.reviews[index] = review
  }

  // The review written by the logged in person for this recipe (or null)
  const myReview = (recipe) =>
    (isLoggedIn.value && recipe.reviews.find(r => r.userId === userId.value)) || null

  // ----- Recipe CRUD -----
  async function saveRecipe(fields, editingId = null) {
    const { recipe } = await apiFetch(editingId ? `/recipes/${editingId}` : '/recipes', {
      method: editingId ? 'PUT' : 'POST',
      body: fields
    })
    replaceRecipe(recipe)
    return recipe
  }

  // Share with the community (records the exact time) or make private again
  async function toggleShare(recipe) {
    const { recipe: updated } = await apiFetch(`/recipes/${recipe.id}/share`, {
      method: 'PATCH',
      body: { shared: !recipe.shared }
    })
    replaceRecipe(updated)
  }

  async function deleteRecipe(id) {
    await apiFetch(`/recipes/${id}`, { method: 'DELETE' })
    recipes.value = recipes.value.filter(r => r.id !== id)
  }

  return {
    recipes, loading, error, fetchRecipes,
    isOwner, isFavorite, favoriteCount, totalFavorites, toggleFavorite,
    averageRating, ratingLabel, ratingText, latestReview, addReview, myReview,
    saveRecipe, toggleShare, deleteRecipe
  }
}
