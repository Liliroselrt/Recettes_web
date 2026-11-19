<template>
  <header class="sticky top-0 z-40 glass-header border-b border-orange-100 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-20 items-center">
        <!-- Logo (the whole block is one link back to the home tab) -->
        <RouterLink to="/" class="flex items-center space-x-3 text-left rounded-2xl p-1 -m-1 hover:bg-orange-50 transition-colors" aria-label="GourmetCraft, go to the home page">
          <span class="w-12 h-12 bg-gradient-to-tr from-brand-500 to-amber-400 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-orange-500/30">
            <i class="fa-solid fa-utensils"></i>
          </span>
          <span>
            <span class="block text-2xl font-extrabold bg-gradient-to-r from-brand-700 via-brand-600 to-amber-600 bg-clip-text text-transparent">GourmetCraft</span>
            <span class="block text-xs font-semibold tracking-wider text-amber-700 uppercase">Community Cookbook</span>
          </span>
        </RouterLink>

        <!-- Desktop Nav Links -->
        <nav class="hidden md:flex items-center space-x-1 bg-amber-100/60 p-1.5 rounded-2xl border border-amber-200/60">
          <RouterLink to="/" :class="navBtnStyle('home')">
            <i class="fa-solid fa-house text-sm"></i>
            <span>Home</span>
          </RouterLink>
          <RouterLink to="/my-creations" :class="navBtnStyle('my-creations')">
            <i class="fa-solid fa-book-open text-sm"></i>
            <span>My Creations</span>
          </RouterLink>
          <RouterLink to="/favorites" :class="navBtnStyle('favorites')">
            <i class="fa-solid fa-heart text-sm"></i>
            <span>Favorites</span>
            <span v-if="favoriteCount > 0" class="ml-1.5 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{{ favoriteCount }}</span>
          </RouterLink>
          <RouterLink to="/plans" :class="navBtnStyle('plans')">
            <i class="fa-solid fa-star text-sm"></i>
            <span>{{ isSubscriber ? 'My Plus' : 'Go Plus' }}</span>
          </RouterLink>
        </nav>

        <!-- User / Auth Controls -->
        <div class="flex items-center space-x-3">
          <button @click="openCreate" class="btn btn-primary btn-lg hidden sm:inline-flex">
            <i class="fa-solid fa-plus"></i>
            <span>Create a recipe</span>
          </button>

          <div v-if="isLoggedIn" class="flex items-center gap-2 sm:gap-3 pl-3 border-l border-amber-200">
            <!-- Reports made about me -->
            <RouterLink to="/my-reports" class="btn btn-secondary btn-icon" title="Reports about me" aria-label="Reports about me">
              <i class="fa-regular fa-flag"></i>
            </RouterLink>
            <!-- Moderation (moderators and admins) -->
            <RouterLink v-if="isModerator" to="/moderation" class="btn btn-secondary btn-icon" title="Moderation" aria-label="Moderation">
              <i class="fa-solid fa-shield-halved"></i>
            </RouterLink>
            <!-- Settings (real admins only): admin panel and "view the site as" -->
            <div v-if="isRealAdmin" class="relative">
              <button type="button" class="btn btn-secondary btn-icon" title="Settings" aria-label="Settings" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen">
                <i class="fa-solid fa-gear"></i>
              </button>
              <div v-if="settingsOpen" class="fixed inset-0 z-40" @click="settingsOpen = false"></div>
              <div v-if="settingsOpen" class="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-orange-100 z-50 p-4" role="dialog" aria-label="Settings">
                <p class="field-label">Settings</p>
                <RouterLink v-if="isAdmin" to="/admin" class="btn btn-secondary btn-sm w-full mb-1" @click="settingsOpen = false">
                  <i class="fa-solid fa-user-shield"></i> Admin panel
                </RouterLink>
                <p class="field-label mt-4">View the site as</p>
                <p class="text-xs text-slate-500 mb-2">Test the site with another type of account. Your real role does not change.</p>
                <label v-for="m in VIEW_MODES" :key="m.value" class="flex items-start gap-3 rounded-xl px-3 py-2 cursor-pointer hover:bg-orange-50">
                  <input type="radio" class="mt-1 accent-orange-600" name="view-as" :checked="viewMode === m.value" @change="changeView(m.value)">
                  <span>
                    <span class="block text-sm font-bold text-slate-800">{{ m.label }}</span>
                    <span class="block text-xs text-slate-500">{{ m.help }}</span>
                  </span>
                </label>
              </div>
            </div>
            <div class="relative w-10 h-10 bg-amber-200 border-2 border-brand-500 rounded-full flex items-center justify-center font-bold text-brand-800 shadow-sm" :title="isSubscriber ? username + ' (Gourmet Plus)' : username">
              {{ username.charAt(0).toUpperCase() }}
              <span v-if="isSubscriber" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center ring-2 ring-white" aria-label="Gourmet Plus member">
                <i class="fa-solid fa-star"></i>
              </span>
            </div>
            <button @click="logout" title="Log out" aria-label="Log out" class="btn btn-secondary btn-icon">
              <i class="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
          <button v-else @click="openAuth" class="btn btn-secondary btn-lg">
            <i class="fa-solid fa-user"></i>
            <span>Log in</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation Bar -->
    <div class="md:hidden flex justify-around border-t border-orange-100 py-2.5 bg-white/90">
      <RouterLink to="/" :class="mobileNavStyle('home')">
        <i class="fa-solid fa-house text-lg"></i>
        <span class="text-xs">Home</span>
      </RouterLink>
      <RouterLink to="/my-creations" :class="mobileNavStyle('my-creations')">
        <i class="fa-solid fa-book-open text-lg"></i>
        <span class="text-xs">My Creations</span>
      </RouterLink>
      <RouterLink to="/favorites" :class="mobileNavStyle('favorites')">
        <i class="fa-solid fa-heart text-lg"></i>
        <span class="text-xs">Favorites ({{ favoriteCount }})</span>
      </RouterLink>
      <RouterLink to="/plans" :class="mobileNavStyle('plans')">
        <i class="fa-solid fa-star text-lg"></i>
        <span class="text-xs">Plus</span>
      </RouterLink>
      <button @click="openCreate" class="mobile-tab mobile-tab-create">
        <i class="fa-solid fa-circle-plus text-xl"></i>
        <span class="text-xs">Create</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useUI } from '../composables/useUI'
import { useRecipes } from '../composables/useRecipes'
import { useSubscription } from '../composables/useSubscription'
import { useRoles, VIEW_MODES } from '../composables/useRoles'

const route = useRoute()
const router = useRouter()
const { isLoggedIn, username, clearSession } = useAuth()
const { openAuth, openCreate } = useUI()
const { favoriteCount } = useRecipes()
const { isSubscriber } = useSubscription()
const { isRealAdmin, isAdmin, isModerator, viewMode, setViewMode } = useRoles()

// Menu des paramètres (admin)
const settingsOpen = ref(false)
watch(() => route.fullPath, () => { settingsOpen.value = false })

async function changeView(mode) {
  await setViewMode(mode)
  // Si la page courante n'est plus permise avec ce type de compte, retour à l'accueil
  if (route.path === '/admin' && !isAdmin.value) router.push('/')
  if (route.path === '/moderation' && !isModerator.value) router.push('/')
}

const navBtnStyle = (tab) => (route.meta.tab === tab ? 'nav-tab nav-tab-active' : 'nav-tab')
const mobileNavStyle = (tab) => (route.meta.tab === tab ? 'mobile-tab mobile-tab-active' : 'mobile-tab')

const logout = () => {
  clearSession()
  router.push('/')
}
</script>
