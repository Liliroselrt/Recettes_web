import { API_URL } from './recipes'
import { useAuth } from '../composables/useAuth'

export class ApiError extends Error {
  constructor(message, errors = null, status = 0) {
    super(message)
    this.errors = errors   // liste de messages de validation (formulaire de recette)
    this.status = status
  }
}

// Appel de l'API : ajoute le jeton JWT, lit le JSON et transforme les erreurs en ApiError
export async function apiFetch(path, { method = 'GET', body, raw = false, contentType } = {}) {
  const { token, clearSession } = useAuth()
  const headers = {}
  if (token.value) headers.Authorization = `Bearer ${token.value}`
  if (contentType) headers['Content-Type'] = contentType
  else if (body !== undefined && !raw) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : (raw ? body : JSON.stringify(body))
    })
  } catch (e) {
    throw new ApiError('Cannot reach the server. Is the backend running on http://localhost:3000?')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    // Jeton expiré (24 h) : on déconnecte proprement
    if (response.status === 401 && token.value) {
      clearSession()
      throw new ApiError('Your session has expired. Please log in again.', null, 401)
    }
    throw new ApiError(data.error || 'Something went wrong.', data.errors || null, response.status)
  }
  return data
}
