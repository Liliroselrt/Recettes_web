<template>
  <!-- Auth window (Log in / Sign up) -->
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button @click="closeAuth" class="modal-close absolute top-4 right-4 !bg-amber-100" aria-label="Close">
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>
      <h3 id="auth-title" class="text-2xl font-bold text-slate-900 mb-2">{{ signup ? 'Create your account' : 'Welcome!' }}</h3>
      <p class="text-slate-500 text-sm mb-6">
        {{ signup ? 'Sign up to add your recipes and favorites.' : 'Log in to add your recipes and favorites.' }}
      </p>

      <form @submit.prevent="submit" class="space-y-4">
        <p v-if="errorMessage" class="alert-error" role="alert">{{ errorMessage }}</p>

        <div>
          <label class="field-label" for="auth-username">{{ signup ? 'Username' : 'Username or email' }}</label>
          <input id="auth-username" v-model="identifier" required type="text" :placeholder="signup ? 'E.g. Chef_Marie' : 'Chef_Lucas'" autocomplete="username" class="field">
        </div>
        <div v-if="signup">
          <label class="field-label" for="auth-email">Email</label>
          <input id="auth-email" v-model="email" required type="email" placeholder="chef@example.com" autocomplete="email" class="field">
        </div>
        <div>
          <label class="field-label" for="auth-password">Password</label>
          <input id="auth-password" v-model="password" required type="password" placeholder="••••••••" :autocomplete="signup ? 'new-password' : 'current-password'" class="field">
        </div>

        <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="loading">
          <i :class="loading ? 'fa-solid fa-spinner fa-spin' : (signup ? 'fa-solid fa-user-plus' : 'fa-solid fa-right-to-bracket')"></i>
          {{ signup ? 'Sign up' : 'Log in' }}
        </button>
      </form>

      <p class="text-center text-sm text-slate-500 mt-5">
        {{ signup ? 'Already have an account?' : 'No account yet?' }}
        <button type="button" @click="switchMode" class="font-bold text-brand-600 hover:text-brand-800 hover:underline">
          {{ signup ? 'Log in' : 'Sign up' }}
        </button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { apiFetch } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { useUI } from '../composables/useUI'

const { setSession } = useAuth()
const { closeAuth } = useUI()

const signup = ref(false)
const identifier = ref('')     // pseudo (ou email pour se connecter)
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

const switchMode = () => {
  signup.value = !signup.value
  errorMessage.value = ''
}

async function submit() {
  errorMessage.value = ''
  loading.value = true
  try {
    if (signup.value) {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: { username: identifier.value.trim(), email: email.value.trim(), password: password.value }
      })
    }
    // After signing up, the new account is logged in straight away
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: { identifier: identifier.value.trim(), password: password.value }
    })
    setSession(data)
    closeAuth()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const onKeydown = (event) => { if (event.key === 'Escape') closeAuth() }
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>
