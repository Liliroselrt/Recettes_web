import { ref } from 'vue'
import { useAuth } from './useAuth'

// État des fenêtres modales partagé entre la barre de navigation, les cartes et les vues
const showAuthModal = ref(false)
const showFormModal = ref(false)
const editingRecipe = ref(null)

export function useUI() {
  const { isLoggedIn } = useAuth()

  const openAuth = () => { showAuthModal.value = true }
  const closeAuth = () => { showAuthModal.value = false }

  // Creating a recipe requires an account: otherwise the log in window opens
  const openCreate = () => {
    if (!isLoggedIn.value) return openAuth()
    editingRecipe.value = null
    showFormModal.value = true
  }
  const openEdit = (recipe) => {
    editingRecipe.value = recipe
    showFormModal.value = true
  }
  const closeForm = () => {
    showFormModal.value = false
    editingRecipe.value = null
  }

  return { showAuthModal, showFormModal, editingRecipe, openAuth, closeAuth, openCreate, openEdit, closeForm }
}
