<template>
  <header class="sticky top-0 z-40 glass-header border-b border-brand-100 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 sm:h-20 items-center gap-3">
        <!-- Logo (the whole block is one link back to the home tab) -->
        <RouterLink to="/" class="flex items-center space-x-3 text-left rounded-2xl p-1 -m-1 hover:bg-brand-50 transition-colors shrink-0" aria-label="GourmetCraft, go to the home page">
          <span class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-tr from-brand-500 to-brand-400 rounded-2xl flex items-center justify-center text-white text-lg sm:text-xl shadow-lg shadow-brand-500/30">
            <i class="fa-solid fa-utensils"></i>
          </span>
          <span class="hidden min-[430px]:block">
            <span class="block text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-brand-700 via-brand-600 to-brand-600 bg-clip-text text-transparent">Ef'Recipe</span>
            <span class="hidden sm:block text-xs font-semibold tracking-wider text-brand-700 uppercase">Community Cookbook</span>
          </span>
        </RouterLink>

        <!-- Desktop Nav Links (icons only on medium screens, with text from lg) -->
        <nav class="hidden md:flex items-center space-x-1 bg-brand-100/60 p-1.5 rounded-2xl border border-brand-200/60" aria-label="Main navigation">
          <RouterLink to="/" :class="navBtnStyle('home')" title="Home">
            <i class="fa-solid fa-house text-sm"></i>
            <span class="hidden lg:inline">Home</span>
          </RouterLink>
          <RouterLink to="/my-creations" :class="navBtnStyle('my-creations')" title="My Creations">
            <i class="fa-solid fa-book-open text-sm"></i>
            <span class="hidden lg:inline">My Creations</span>
          </RouterLink>
          <RouterLink to="/plans" :class="navBtnStyle('plans')" :title="isSubscriber ? 'My Plus' : 'Go Plus'">
            <i class="fa-solid fa-star text-sm"></i>
            <span class="hidden lg:inline">{{ isSubscriber ? 'My Plus' : 'Go Plus' }}</span>
          </RouterLink>
        </nav>

        <!-- Actions: create, messages, account -->
        <div class="flex items-center gap-2 sm:gap-3">
          <button @click="openCreate" class="btn btn-primary btn-lg hidden sm:inline-flex" title="Create a recipe" aria-label="Create a recipe">
            <i class="fa-solid fa-plus"></i>
            <span class="hidden xl:inline">Create a recipe</span>
          </button>

          <template v-if="isLoggedIn">
            <!-- Community: find cooks, the people I follow -->
            <RouterLink to="/following" class="btn btn-icon" :class="route.meta.tab === 'following' ? 'btn-primary' : 'btn-secondary'" title="Community" aria-label="Community">
              <i class="fa-solid fa-user-group"></i>
            </RouterLink>

            <!-- Messages: chats with members and requests to the staff -->
            <RouterLink to="/messages" class="btn btn-icon relative" :class="route.meta.tab === 'messages' ? 'btn-primary' : 'btn-secondary'" :title="unread.total ? `Messages (${unread.total} new)` : 'Messages'" :aria-label="unread.total ? `Messages, ${unread.total} new` : 'Messages'">
              <i class="fa-solid fa-message"></i>
              <span v-if="unread.total > 0" class="count-badge absolute -top-1.5 -right-1.5 ring-2 ring-white">{{ unread.total > 9 ? '9+' : unread.total }}</span>
            </RouterLink>

            <!-- My profile: the photo opens my profile page -->
            <RouterLink :to="`/users/${userId}`" class="relative block w-10 h-10 rounded-full shadow-sm hover:ring-2 hover:ring-brand-300 transition-shadow" :title="'My profile (' + username + ')'" aria-label="My profile">
              <UserAvatar :name="username" :src="profile && profile.avatarUrl" size="md" class="border-2 border-brand-500" />
              <span v-if="isSubscriber" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center ring-2 ring-white" aria-label="Gourmet Plus member">
                <i class="fa-solid fa-star"></i>
              </span>
            </RouterLink>

            <!-- Settings menu: the gear opens and closes it; a click anywhere else closes it too -->
            <div ref="menuRoot" class="relative">
              <button type="button" class="btn btn-icon" :class="menuOpen ? 'btn-primary' : 'btn-secondary'" aria-haspopup="menu" :aria-expanded="menuOpen" title="Settings" aria-label="Settings" @click="menuOpen = !menuOpen">
                <i class="fa-solid fa-gear"></i>
              </button>

              <div v-if="menuOpen" class="absolute right-0 mt-2 w-72 max-w-[92vw] max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-brand-100 z-50 p-2" role="menu" aria-label="Account menu">
                <!-- Who am I -->
                <div class="flex items-center gap-3 px-3 py-2.5">
                  <UserAvatar :name="username" :src="profile && profile.avatarUrl" size="md" />
                  <span class="min-w-0">
                    <span class="block font-bold text-slate-900 truncate">{{ username }}</span>
                    <span v-if="role === 'admin'" class="tag !ml-0 tag-warn">Admin</span>
                    <span v-else-if="role === 'moderator'" class="tag !ml-0 tag-warn">Moderator</span>
                    <span v-else-if="isSubscriber" class="tag !ml-0 tag-warn">Plus</span>
                  </span>
                </div>

                <!-- The create button is hidden on small screens, so it lives here too -->
                <button type="button" class="menu-item sm:hidden" role="menuitem" @click="createFromMenu"><i class="fa-solid fa-plus"></i> Create a recipe</button>

                <div class="my-1.5 border-t border-brand-100"></div>
                <RouterLink to="/settings" class="menu-item" role="menuitem"><i class="fa-solid fa-user-pen"></i> Profile settings</RouterLink>
                <RouterLink to="/history" class="menu-item" role="menuitem"><i class="fa-solid fa-clock-rotate-left"></i> Cooking history</RouterLink>
                <RouterLink to="/my-reports" class="menu-item" role="menuitem"><i class="fa-regular fa-flag"></i> Reports about me</RouterLink>

                <!-- Staff tools -->
                <template v-if="isModerator">
                  <div class="my-1.5 border-t border-brand-100"></div>
                  <p class="menu-label">{{ isAdmin ? 'Administration' : 'Moderation' }}</p>
                  <RouterLink to="/moderation" class="menu-item" role="menuitem"><i class="fa-solid fa-shield-halved"></i> Moderation</RouterLink>
                  <RouterLink v-if="isAdmin" to="/admin" class="menu-item" role="menuitem"><i class="fa-solid fa-user-shield"></i> Admin panel</RouterLink>
                </template>

                <!-- "View the site as" (real admins only) -->
                <template v-if="isRealAdmin">
                  <div class="my-1.5 border-t border-brand-100"></div>
                  <details class="group" :open="viewMode !== ''">
                    <summary class="menu-item cursor-pointer list-none">
                      <i class="fa-solid fa-eye"></i>
                      <span class="flex-1">View the site as</span>
                      <span v-if="viewMode" class="tag !ml-0 tag-warn">{{ currentViewLabel }}</span>
                      <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform group-open:rotate-180"></i>
                    </summary>
                    <p class="text-xs text-slate-500 px-3 pb-2">Test the site with another type of account. Your real role does not change.</p>
                    <label v-for="m in VIEW_MODES" :key="m.value" class="flex items-start gap-3 rounded-xl px-3 py-2 cursor-pointer hover:bg-brand-50">
                      <input type="radio" class="mt-1 accent-brand-600" name="view-as" :checked="viewMode === m.value" @change="changeView(m.value)">
                      <span>
                        <span class="block text-sm font-bold text-slate-800">{{ m.label }}</span>
                        <span class="block text-xs text-slate-500">{{ m.help }}</span>
                      </span>
                    </label>
                  </details>
                </template>

                <div class="my-1.5 border-t border-brand-100"></div>
                <button type="button" class="menu-item menu-item-danger" role="menuitem" @click="logout"><i class="fa-solid fa-right-from-bracket"></i> Log out</button>
              </div>
            </div>
          </template>

          <template v-else>
            <button type="button" @click="openAuth" class="btn btn-secondary btn-lg">
              <i class="fa-solid fa-right-to-bracket"></i>
              <span>Log in</span>
            </button>
            <button type="button" @click="openSignup" class="btn btn-primary btn-lg">
              <i class="fa-solid fa-user-plus"></i>
              <span>Sign up</span>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation Bar -->
    <div class="md:hidden flex justify-around border-t border-brand-100 py-2.5 bg-white/90">
      <RouterLink to="/" :class="mobileNavStyle('home')">
        <i class="fa-solid fa-house text-lg"></i>
        <span class="text-xs">Home</span>
      </RouterLink>
      <RouterLink to="/my-creations" :class="mobileNavStyle('my-creations')">
        <i class="fa-solid fa-book-open text-lg"></i>
        <span class="text-xs">My Creations</span>
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useUI } from '../composables/useUI'
import { useSubscription } from '../composables/useSubscription'
import { useRoles, VIEW_MODES } from '../composables/useRoles'
import { useMessages } from '../composables/useMessages'
import UserAvatar from './UserAvatar.vue'

const route = useRoute()
const router = useRouter()
const { isLoggedIn, userId, username, clearSession } = useAuth()
const { openAuth, openSignup, openCreate } = useUI()
const { isSubscriber } = useSubscription()
const { profile, role, isRealAdmin, isAdmin, isModerator, viewMode, setViewMode } = useRoles()
const { unread, refreshUnread } = useMessages()

// Menu du compte : se ferme au changement de page et avec la touche Échap
const menuOpen = ref(false)
const menuRoot = ref(null)
watch(() => route.fullPath, () => { menuOpen.value = false })
const onKeydown = (e) => { if (e.key === 'Escape') menuOpen.value = false }
// A press anywhere outside the gear and the menu closes it (the gear itself toggles it)
const onPointerDown = (e) => {
  if (menuOpen.value && menuRoot.value && !menuRoot.value.contains(e.target)) menuOpen.value = false
}
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('pointerdown', onPointerDown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onPointerDown)
})

const currentViewLabel = computed(() => {
  const mode = VIEW_MODES.find(m => m.value === viewMode.value)
  return mode ? mode.label : ''
})

async function changeView(mode) {
  await setViewMode(mode)
  refreshUnread()   // la boîte de réception du staff dépend du rôle affiché
  // Si la page courante n'est plus permise avec ce type de compte, retour à l'accueil
  if (route.path === '/admin' && !isAdmin.value) router.push('/')
  if (route.path === '/moderation' && !isModerator.value) router.push('/')
}

const createFromMenu = () => { menuOpen.value = false; openCreate() }

const navBtnStyle = (tab) => (route.meta.tab === tab ? 'nav-tab nav-tab-active' : 'nav-tab')
const mobileNavStyle = (tab) => (route.meta.tab === tab ? 'mobile-tab mobile-tab-active' : 'mobile-tab')

const logout = () => {
  menuOpen.value = false
  clearSession()
  router.push('/')
}
</script>
