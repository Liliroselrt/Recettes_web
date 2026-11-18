import { ref, computed } from 'vue'

// État partagé : réactif pour que la Navbar se mette à jour sans rechargement
const token = ref(localStorage.getItem('token'))
const userId = ref(Number(localStorage.getItem('userId')) || null)
const username = ref(localStorage.getItem('username') || '')

export function useAuth() {
  const isLoggedIn = computed(() => !!token.value)

  const setSession = (data) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('userId', data.user.id)
    localStorage.setItem('username', data.user.username)
    token.value = data.token
    userId.value = Number(data.user.id)
    username.value = data.user.username
  }

  const clearSession = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    token.value = null
    userId.value = null
    username.value = ''
  }

  return { token, userId, username, isLoggedIn, setSession, clearSession }
}
