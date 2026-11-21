import { useAuth } from './useAuth'
import { useUI } from './useUI'

// Un visiteur non connecté peut ouvrir 3 recettes différentes ; ensuite il doit se connecter
// ou créer un compte. Le compteur est gardé dans ce navigateur (localStorage).
export const GUEST_RECIPE_LIMIT = 3
const STORAGE_KEY = 'gc_guest_viewed'

const load = () => {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function useGuestLimit() {
  const { isLoggedIn } = useAuth()
  const { openAuthWithNotice } = useUI()

  // true = la recette peut s'ouvrir. Sinon la fenêtre de connexion s'ouvre à la place.
  function allowRecipe(recipeId) {
    if (isLoggedIn.value) return true
    const viewed = load()
    if (viewed.includes(recipeId)) return true
    if (viewed.length >= GUEST_RECIPE_LIMIT) {
      openAuthWithNotice(`You have viewed ${GUEST_RECIPE_LIMIT} recipes as a guest. Create a free account or log in to keep browsing.`)
      return false
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...viewed, recipeId])) } catch { /* stockage indisponible */ }
    return true
  }

  return { allowRecipe }
}
