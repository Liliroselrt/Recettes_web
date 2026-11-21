import { ref, computed, watch } from 'vue'
import { apiFetch } from '../utils/api'
import { useAuth } from './useAuth'
import { useRecipes } from './useRecipes'
import { useRoles } from './useRoles'

// Plan payant unique (le prix réel vient du serveur ; ceci sert à l'affichage)
export const PLAN = { name: 'Gourmet Plus', price: 30, currency: 'ZAR', priceLabel: 'R30' }

// { isSubscriber, status, startDate, endDate, willRenew } ou null (non connecté)
const subscription = ref(null)
const loading = ref(false)

const { token } = useAuth()

async function refresh() {
  if (!token.value) {
    subscription.value = null
    return
  }
  loading.value = true
  try {
    subscription.value = await apiFetch('/subscription/me')
  } catch (e) {
    subscription.value = null
  } finally {
    loading.value = false
  }
}

// Connexion / déconnexion : l'état d'abonnement change
watch(token, refresh, { immediate: true })

export function useSubscription() {
  const { fetchRecipes } = useRecipes()
  const { isModerator } = useRoles()
  // Moderators and admins have Gourmet Plus included (an admin "viewing as a regular user" does not)
  const hasStaffAccess = computed(() => isModerator.value)
  const isSubscriber = computed(() => hasStaffAccess.value || !!subscription.value?.isSubscriber)
  const willRenew = computed(() => !!subscription.value?.willRenew)
  const simulated = computed(() => !!subscription.value?.simulated) // admin qui « voit comme » un abonné
  const endDate = computed(() => subscription.value?.endDate || null)

  // Paiement simulé : le serveur crée l'abonnement, puis on recharge les recettes (vidéos débloquées)
  async function subscribe() {
    subscription.value = await apiFetch('/subscription/subscribe', { method: 'POST' })
    await fetchRecipes()
  }

  async function cancel() {
    await apiFetch('/subscription/cancel', { method: 'POST' })
    await refresh()
  }

  return { subscription, loading, isSubscriber, hasStaffAccess, willRenew, simulated, endDate, refresh, subscribe, cancel }
}
