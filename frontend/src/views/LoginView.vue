<template>
  <div class="auth-container">
    <form @submit.prevent="handleLogin" class="auth-form">
      <h2>Connexion</h2>
      <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

      <label>Email</label>
      <input v-model="email" type="email" required placeholder="chef@exemple.com" />
      
      <label>Mot de passe</label>
      <input v-model="password" type="password" required />
      
      <button type="submit">Se connecter</button>
      <p>Pas encore de compte ? <RouterLink to="/register">Inscrivez-vous</RouterLink></p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const errorMessage = ref('')

const handleLogin = async () => {
  errorMessage.value = ''
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        password: password.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value = data.error || 'Identifiants incorrects.'
      return
    }

    // Stockage du vrai token JWT et des infos de l'utilisateur
    localStorage.setItem('token', data.token)
    localStorage.setItem('userId', data.user.id)
    localStorage.setItem('username', data.user.username)

    window.location.href = '/dashboard'
  } catch (error) {
    errorMessage.value = 'Impossible de joindre le serveur.'
  }
}
</script>

<style scoped>
.auth-container { max-width: 400px; margin: 3rem auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.auth-form { display: flex; flex-direction: column; gap: 1rem; }
input { padding: 0.6rem; border: 1px solid #ccc; border-radius: 5px; }
button { background: #21773b; color: white; border: none; padding: 0.8rem; border-radius: 5px; font-weight: bold; cursor: pointer; }
.error-msg { color: #d63031; background: #ffeaea; padding: 0.6rem; border-radius: 5px; font-size: 0.9rem; margin: 0; }
</style>