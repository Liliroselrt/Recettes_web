<template>
  <nav class="navbar">
    <div class="nav-brand">
      <RouterLink to="/">🍳 Marmit'Code</RouterLink>
    </div>
    <div class="nav-links">
      <RouterLink to="/">Explorer</RouterLink>
      <template v-if="isLoggedIn">
        <RouterLink to="/dashboard">Mon Carnet</RouterLink>
        <button @click="logout" class="btn-logout">Déconnexion</button>
      </template>
      <template v-else>
        <RouterLink to="/login">Connexion</RouterLink>
        <RouterLink to="/register" class="btn-register">Inscription</RouterLink>
      </template>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoggedIn = ref(false)

onMounted(() => {
  isLoggedIn.value = !!localStorage.getItem('token')
})

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  isLoggedIn.value = false
  router.push('/login')
}
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ff6b6b;
  padding: 1rem 2rem;
  color: white;
}
.nav-brand a {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
}
.nav-links {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}
.nav-links a {
  color: white;
  text-decoration: none;
  font-weight: 500;
}
.btn-register {
  background: white;
  color: #ff6b6b !important;
  padding: 0.4rem 0.8rem;
  border-radius: 5px;
}
.btn-logout {
  background: transparent;
  border: 1px solid white;
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 5px;
  cursor: pointer;
}
</style>