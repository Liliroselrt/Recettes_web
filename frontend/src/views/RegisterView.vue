<template>
  <div class="auth-container">
    <form @submit.prevent="handleRegister" class="auth-form">
      <h2>Créer un compte</h2>
      <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

      <label>Nom de chef (Pseudo)</label>
      <input v-model="username" type="text" required placeholder="ChefLucas" />

      <label>Email</label>
      <input v-model="email" type="email" required placeholder="chef@exemple.com" />
      
      <label>Mot de passe</label>
      <input v-model="password" type="password" required />
      
      <button type="submit">S'inscrire</button>
      <p>Déjà un compte ? <RouterLink to="/login">Connectez-vous</RouterLink></p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const email = ref('')
const password = ref('')
const errorMessage = ref('')

const handleRegister = async () => {
  errorMessage.value = ''
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value = data.error || "Erreur lors de l'inscription."
      return
    }

    alert('Compte créé avec succès ! Vous pouvez maintenant vous connecter.')
    router.push('/login')
  } catch (error) {
    errorMessage.value = 'Impossible de joindre le serveur.'
  }
}
</script>

<style scoped>
.auth-container { max-width: 400px; margin: 3rem auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.auth-form { display: flex; flex-direction: column; gap: 1rem; }
input { padding: 0.6rem; border: 1px solid #ccc; border-radius: 5px; }
button { background: #ff6b6b; color: white; border: none; padding: 0.8rem; border-radius: 5px; font-weight: bold; cursor: pointer; }
.error-msg { color: #d63031; background: #ffeaea; padding: 0.6rem; border-radius: 5px; font-size: 0.9rem; margin: 0; }
</style>