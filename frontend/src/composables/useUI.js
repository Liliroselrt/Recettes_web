import { ref } from 'vue'
import { useAuth } from './useAuth'

// État des fenêtres modales partagé entre la barre de navigation, les cartes et les vues
const showAuthModal = ref(false)
const showFormModal = ref(false)
const editingRecipe = ref(null)
const authStartsAsSignup = ref(false)   // la fenêtre s'ouvre sur « Sign up » (bouton Register)
const authNotice = ref('')   // message affiché en haut de la fenêtre de connexion (ex. limite de visiteur)

export function useUI() {
  const { isLoggedIn } = useAuth()

  const openAuth = () => { authNotice.value = ''; authStartsAsSignup.value = false; showAuthModal.value = true }
  const openSignup = () => { authNotice.value = ''; authStartsAsSignup.value = true; showAuthModal.value = true }
  const openAuthWithNotice = (message) => { authNotice.value = message; showAuthModal.value = true }
  const closeAuth = () => { showAuthModal.value = false; authNotice.value = ''; authStartsAsSignup.value = false }

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

  return { showAuthModal, showFormModal, editingRecipe, authNotice, authStartsAsSignup, openAuth, openSignup, openAuthWithNotice, closeAuth, openCreate, openEdit, closeForm }
}
