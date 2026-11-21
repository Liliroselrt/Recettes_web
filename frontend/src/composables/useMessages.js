import { ref, watch } from 'vue'
import { apiFetch } from '../utils/api'
import { useAuth } from './useAuth'

// Compteurs de messages non lus (pastille de la barre de navigation).
//   chats   : messages privés non lus
//   support : réponses du staff à mes demandes, non lues
//   inbox   : (staff) demandes des membres en attente d'une réponse
//   team    : (admins) demandes de l'équipe en attente
//   total   : la somme de tout
const EMPTY = { chats: 0, support: 0, inbox: 0, team: 0, isStaff: false, total: 0 }
const counts = ref({ ...EMPTY })

const { token } = useAuth()
const POLL_MS = 30000
let timer = null

async function refreshUnread() {
  if (!token.value) { counts.value = { ...EMPTY }; return }
  try {
    counts.value = await apiFetch('/messages/unread')
  } catch (e) {
    // Silencieux : la pastille n'est pas critique (et apiFetch gère déjà l'expiration de session)
  }
}

function stopPolling() {
  clearInterval(timer)
  timer = null
}

function startPolling() {
  stopPolling()
  timer = setInterval(() => { if (!document.hidden) refreshUnread() }, POLL_MS)
}

// Connexion / déconnexion : on repart de zéro ou on lance la vérification régulière
watch(token, (value) => {
  if (value) { refreshUnread(); startPolling() } else { stopPolling(); counts.value = { ...EMPTY } }
}, { immediate: true })

// Retour sur l'onglet du navigateur : mise à jour immédiate
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!document.hidden && token.value) refreshUnread() })
}

export function useMessages() {
  return { unread: counts, refreshUnread }
}
