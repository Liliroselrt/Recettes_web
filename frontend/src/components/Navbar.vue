<template>
  <nav class="navbar">
    <div class="nav-brand">
      <RouterLink to="/"> Ef'recipes</RouterLink>
    </div>
    <div class="nav-links">
      <RouterLink to="/">Explore</RouterLink>
      <template v-if="isLoggedIn">
        <RouterLink to="/dashboard">My book</RouterLink>
        <button @click="logout" class="btn-logout">Déconnexion</button>
      </template>
      <template v-else>
        <RouterLink to="/login">Login</RouterLink>
        <RouterLink to="/register" class="btn-register">Sign up</RouterLink>
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
  background-color: #21773b;
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
  color: #1b592e !important;
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