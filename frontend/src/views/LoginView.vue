<template>
  <div class="auth-container">
    <form @submit.prevent="handleLogin" class="auth-form">
      <h2>Connexion</h2>
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
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')

const handleLogin = () => {
  // Simulation de connexion réussie (à remplacer par POST /api/auth/login)
  localStorage.setItem('token', 'faux-jwt-token-de-test')
  localStorage.setItem('userId', '1')
  // Recharge pour mettre à jour la Navbar et redirige vers le carnet
  window.location.href = '/dashboard'
}
</script>

<style scoped>
.auth-container { max-width: 400px; margin: 3rem auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.auth-form { display: flex; flex-direction: column; gap: 1rem; }
input { padding: 0.6rem; border: 1px solid #ccc; border-radius: 5px; }
button { background: #ff6b6b; color: white; border: none; padding: 0.8rem; border-radius: 5px; font-weight: bold; cursor: pointer; }
</style>