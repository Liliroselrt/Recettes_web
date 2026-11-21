import { apiFetch } from '../utils/api'
import { useAuth } from './useAuth'
import { usePantry } from './usePantry'

// « I cooked this » : enregistre la recette dans l'historique (si la personne est connectée)
// et retire les quantités utilisées du garde-manger (qui, lui, reste dans ce navigateur).
export function useCooking() {
  const { isLoggedIn } = useAuth()
  const { consumeRecipe } = usePantry()

  // -> { saved: true si ajoutée à l'historique, entry, changes: ingrédients déduits du garde-manger }
  async function markCooked(recipe, { note = '', deductPantry = true } = {}) {
    let entry = null
    // L'historique d'abord : si le serveur refuse, le garde-manger n'est pas touché
    if (isLoggedIn.value) {
      const result = await apiFetch(`/recipes/${recipe.id}/cooked`, { method: 'POST', body: { note: note.trim() } })
      entry = result.entry
    }
    const changes = deductPantry ? consumeRecipe(recipe) : []
    return { saved: !!entry, entry, changes }
  }

  return { markCooked }
}
