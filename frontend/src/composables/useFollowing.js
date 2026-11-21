import { ref, computed, watch } from 'vue'
import { apiFetch } from '../utils/api'
import { useAuth } from './useAuth'

// Les personnes que je suis, partagées entre les pages (accueil : filtre et tri par chefs suivis).
// [{ id, username, avatarUrl, specialty, location }], la dernière personne suivie en premier.
const following = ref([])
const { token, userId } = useAuth()

async function loadFollowing() {
  if (!token.value || !userId.value) { following.value = []; return }
  try {
    following.value = await apiFetch(`/users/${userId.value}/following`)
  } catch (e) {
    // On garde la liste précédente : le filtre reste utilisable même si le serveur répond mal une fois
  }
}

// Connexion / déconnexion
watch(token, loadFollowing, { immediate: true })

export function useFollowing() {
  const followingIds = computed(() => new Set(following.value.map(p => p.id)))
  return { following, followingIds, loadFollowing }
}
