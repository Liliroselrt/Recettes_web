import { ref } from 'vue'

// Mode « voir le site comme » d'un admin : '' (aucun) | 'moderator' | 'subscriber' | 'user'.
// Envoyé au serveur dans l'en-tête X-View-As ; le serveur ne le prend en compte que pour un vrai admin.
export const viewAs = ref(localStorage.getItem('viewAs') || '')

export function setViewAs(mode) {
  viewAs.value = mode || ''
  if (mode) localStorage.setItem('viewAs', mode)
  else localStorage.removeItem('viewAs')
}
