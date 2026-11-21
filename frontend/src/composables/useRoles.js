import { ref, computed, watch } from 'vue'
import { apiFetch } from '../utils/api'
import { useAuth } from './useAuth'
import { viewAs, setViewAs } from '../utils/viewAs'
import { useRecipes } from './useRecipes'
import { useSubscription } from './useSubscription'

// Types de compte qu'un admin peut « voir » pour tester le site
export const VIEW_MODES = [
  { value: '', label: 'Admin (my real account)', help: 'Full access' },
  { value: 'moderator', label: 'Moderator', help: 'Moderation page, no admin tools' },
  { value: 'subscriber', label: 'Subscriber', help: 'Videos unlocked, no staff tools' },
  { value: 'user', label: 'Regular user', help: 'No subscription, no staff tools' }
]

// Profil de la personne connectée : { id, username, role, canReport, isBanned, bannedReason }
const profile = ref(null)
const { token } = useAuth()

async function loadProfile() {
  if (!token.value) {
    profile.value = null
    setViewAs('')
    return
  }
  try {
    profile.value = await apiFetch('/auth/me')
  } catch (e) {
    profile.value = null
  }
}
watch(token, loadProfile, { immediate: true })

export function useRoles() {
  const realRole = computed(() => (profile.value ? profile.value.role : null))
  const isRealAdmin = computed(() => realRole.value === 'admin')
  const viewMode = computed(() => (isRealAdmin.value ? viewAs.value : ''))

  // Rôle avec lequel le site se comporte : un admin qui « voit comme » un autre type de compte en prend les droits
  const role = computed(() => {
    if (!realRole.value) return null
    if (isRealAdmin.value && viewMode.value) return viewMode.value === 'moderator' ? 'moderator' : 'user'
    return realRole.value
  })
  const isAdmin = computed(() => role.value === 'admin')
  const isModerator = computed(() => role.value === 'moderator' || role.value === 'admin')
  // Compte suspendu : peut se connecter et lire, mais ne peut plus commenter ni partager de recette
  const isRestricted = computed(() => !!(profile.value && profile.value.isBanned))
  const restrictionReason = computed(() => (profile.value && profile.value.bannedReason) || '')

  async function setViewMode(mode) {
    setViewAs(mode)
    const { fetchRecipes } = useRecipes()
    const { refresh } = useSubscription()
    await Promise.all([fetchRecipes(), refresh()])
  }

  return { profile, realRole, role, isRealAdmin, isAdmin, isModerator, isRestricted, restrictionReason, viewMode, setViewMode }
}
