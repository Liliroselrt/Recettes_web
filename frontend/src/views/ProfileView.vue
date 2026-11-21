<template>
  <div>
    <p v-if="loadingProfile" class="text-center text-slate-500 py-16">
      <i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading profile...
    </p>
    <div v-else-if="profileError" class="alert-error my-8">
      {{ profileError }}
      <RouterLink to="/" class="underline font-bold ml-2">Back to the recipes</RouterLink>
    </div>

    <template v-else-if="profile">
      <!-- Chef card -->
      <section class="panel p-6 sm:p-8 mb-10">
        <div class="flex flex-col sm:flex-row gap-6 sm:items-start">
          <UserAvatar :name="profile.username" :src="profile.avatarUrl" size="xl" class="border-4 border-brand-500 shadow-md" />

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <h1 class="text-3xl font-extrabold text-slate-900 break-words">{{ profile.username }}</h1>
                <p class="text-xs text-slate-500 mt-1">
                  <i class="fa-regular fa-calendar mr-1"></i>Member since {{ memberSince }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <RouterLink v-if="profile.isMe" to="/settings" class="btn btn-secondary btn-lg">
                  <i class="fa-solid fa-user-pen"></i> Edit my profile
                </RouterLink>
                <template v-else>
                  <button type="button" class="btn btn-lg" :class="profile.isFollowing ? 'btn-secondary' : 'btn-primary'" :disabled="followBusy" :aria-pressed="profile.isFollowing" :title="profile.isFollowing ? 'Unfollow ' + profile.username : 'Follow ' + profile.username" @click="onFollow">
                    <i :class="followBusy ? 'fa-solid fa-spinner fa-spin' : (profile.isFollowing ? 'fa-solid fa-user-check' : 'fa-solid fa-user-plus')"></i>
                    {{ profile.isFollowing ? 'Following' : 'Follow' }}
                  </button>
                  <RouterLink :to="`/messages?user=${profile.id}`" class="btn btn-secondary btn-lg" :title="'Message ' + profile.username">
                    <i class="fa-regular fa-message"></i> Message
                  </RouterLink>
                  <button type="button" class="btn btn-secondary btn-icon btn-lg" title="Report this chef" aria-label="Report this chef" @click="openReport">
                    <i class="fa-regular fa-flag"></i>
                  </button>
                </template>
              </div>
            </div>

            <p v-if="followError" role="alert" class="text-xs font-semibold text-rose-600 mt-2">{{ followError }}</p>

            <!-- Specialty, location, website -->
            <div v-if="profile.specialty || profile.location || safeWebsite" class="flex flex-wrap items-center gap-2 mt-4">
              <span v-if="profile.specialty" class="tag"><i class="fa-solid fa-bowl-food mr-1"></i>{{ profile.specialty }}</span>
              <span v-if="profile.location" class="tag"><i class="fa-solid fa-location-dot mr-1"></i>{{ profile.location }}</span>
              <a v-if="safeWebsite" :href="safeWebsite" target="_blank" rel="noopener noreferrer nofollow" class="tag hover:underline">
                <i class="fa-solid fa-link mr-1"></i>{{ websiteLabel }}
              </a>
            </div>

            <p v-if="profile.bio" class="text-slate-700 leading-relaxed mt-4 whitespace-pre-line break-words">{{ profile.bio }}</p>
            <p v-else-if="profile.isMe" class="text-sm text-slate-400 italic mt-4">
              You have not written a bio yet. <RouterLink to="/settings" class="underline font-semibold text-brand-600">Add one</RouterLink>
            </p>

            <!-- Numbers: followers and following open a list -->
            <div class="flex flex-wrap gap-3 mt-5">
              <div class="stat-box">
                <span class="stat-number">{{ profile.recipesCount }}</span>
                <span class="stat-label">Recipe{{ profile.recipesCount === 1 ? '' : 's' }}</span>
              </div>
              <button type="button" class="stat-box stat-button" :class="openList === 'followers' ? 'stat-active' : ''" :aria-expanded="openList === 'followers'" @click="toggleList('followers')">
                <span class="stat-number">{{ profile.followersCount }}</span>
                <span class="stat-label">Follower{{ profile.followersCount === 1 ? '' : 's' }}</span>
              </button>
              <button type="button" class="stat-box stat-button" :class="openList === 'following' ? 'stat-active' : ''" :aria-expanded="openList === 'following'" @click="toggleList('following')">
                <span class="stat-number">{{ profile.followingCount }}</span>
                <span class="stat-label">Following</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Followers / following list -->
        <div v-if="openList" class="mt-6 pt-5 border-t border-orange-100">
          <h2 class="field-label">{{ openList === 'followers' ? 'Followers' : 'Following' }}</h2>
          <p v-if="listLoading" class="text-sm text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</p>
          <p v-else-if="listError" class="text-sm text-rose-600" role="alert">{{ listError }}</p>
          <p v-else-if="listUsers.length === 0" class="text-sm text-slate-500">
            {{ openList === 'followers' ? 'Nobody follows this chef yet.' : 'This chef does not follow anyone yet.' }}
          </p>
          <ul v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <li v-for="person in listUsers" :key="person.id">
              <RouterLink :to="`/users/${person.id}`" class="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-orange-50 transition-colors">
                <UserAvatar :name="person.username" :src="person.avatarUrl" size="sm" />
                <span class="font-semibold text-slate-800 truncate">{{ person.username }}</span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </section>

      <!-- Published recipes -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-slate-900">Recipes by {{ profile.username }}</h2>
        <p class="text-slate-500 text-sm mt-1">{{ chefRecipes.length }} published recipe{{ chefRecipes.length === 1 ? '' : 's' }}</p>
      </div>

      <p v-if="recipesLoading" class="text-center text-slate-500 py-12">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading recipes...
      </p>
      <div v-else-if="recipesError" class="alert-error my-8">
        {{ recipesError }}
        <button @click="fetchRecipes" class="underline font-bold ml-2">Try again</button>
      </div>
      <div v-else-if="chefRecipes.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <RecipeCard v-for="recipe in chefRecipes" :key="recipe.id" :recipe="recipe" @open="openRecipeDetail" />
      </div>
      <div v-else class="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-amber-200 my-8">
        <div class="w-20 h-20 bg-amber-100 text-brand-500 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
          <i class="fa-solid fa-cookie-bite"></i>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-2">No published recipe yet</h3>
        <p class="text-slate-500 max-w-md mx-auto">
          {{ profile.isMe ? 'Share a recipe from My Creations and it will appear here.' : profile.username + ' has not shared any recipe yet.' }}
        </p>
      </div>
    </template>

    <!-- Recipe window (previous / next follow this chef's recipes) -->
    <RecipeModal
      v-if="selectedRecipe"
      :recipe="selectedRecipe"
      :previous="previousRecipe"
      :next="nextRecipe"
      :index="selectedIndex"
      :total="chefRecipes.length"
      @close="selectedId = null"
      @navigate="goToRecipe"
    />
    <ReportModal v-if="reportTarget" :target="reportTarget" @close="reportTarget = null" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import RecipeCard from '../components/RecipeCard.vue'
import RecipeModal from '../components/RecipeModal.vue'
import ReportModal from '../components/ReportModal.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { apiFetch } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { useUI } from '../composables/useUI'
import { useRecipes } from '../composables/useRecipes'
import { useGuestLimit } from '../composables/useGuestLimit'

const route = useRoute()
const { token, isLoggedIn } = useAuth()
const { openAuth } = useUI()
const { recipes, loading: recipesLoading, error: recipesError, fetchRecipes } = useRecipes()
const { allowRecipe } = useGuestLimit()

const profileId = computed(() => Number(route.params.id))
const profile = ref(null)
const loadingProfile = ref(true)
const profileError = ref('')

async function loadProfile() {
  try {
    profile.value = await apiFetch(`/users/${profileId.value}`)
    profileError.value = ''
  } catch (e) {
    profile.value = null
    profileError.value = e.status === 404 ? 'This chef does not exist (or no longer exists).' : e.message
  } finally {
    loadingProfile.value = false
  }
}

const memberSince = computed(() =>
  profile.value ? new Date(profile.value.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '')

// Only http(s) links become clickable
const safeWebsite = computed(() => (profile.value && /^https?:\/\/\S+$/i.test(profile.value.websiteUrl || '') ? profile.value.websiteUrl : null))
const websiteLabel = computed(() => {
  try { return new URL(safeWebsite.value).hostname.replace(/^www\./, '') } catch { return safeWebsite.value }
})

// ----- Follow -----
const followBusy = ref(false)
const followError = ref('')

async function onFollow() {
  if (!isLoggedIn.value) return openAuth()
  followBusy.value = true
  followError.value = ''
  try {
    const result = await apiFetch(`/users/${profile.value.id}/follow`, { method: 'POST', body: { following: !profile.value.isFollowing } })
    profile.value.isFollowing = result.isFollowing
    profile.value.followersCount = result.followersCount
    if (openList.value === 'followers') loadList('followers')
  } catch (e) {
    followError.value = e.message
  } finally {
    followBusy.value = false
  }
}

// ----- Followers / following list -----
const openList = ref(null)   // null | 'followers' | 'following'
const listUsers = ref([])
const listLoading = ref(false)
const listError = ref('')

async function loadList(kind) {
  listLoading.value = true
  listError.value = ''
  try {
    const data = await apiFetch(`/users/${profileId.value}/${kind}`)
    if (openList.value === kind) listUsers.value = data
  } catch (e) {
    listError.value = e.message
  } finally {
    listLoading.value = false
  }
}
function toggleList(kind) {
  if (openList.value === kind) { openList.value = null; return }
  openList.value = kind
  listUsers.value = []
  loadList(kind)
}

// ----- Report -----
const reportTarget = ref(null)
function openReport() {
  if (!isLoggedIn.value) return openAuth()
  reportTarget.value = { type: 'user', id: profile.value.id, kind: 'This chef', label: profile.value.username }
}

// ----- Published recipes of this chef (already loaded with all the recipes of the site) -----
const sortTime = (recipe) => new Date(recipe.sharedAt || recipe.createdAt).getTime()
const chefRecipes = computed(() =>
  recipes.value
    .filter(r => r.userId === profileId.value && r.shared && !r.isHidden)
    .sort((a, b) => sortTime(b) - sortTime(a)))

const selectedId = ref(null)
const openRecipeDetail = (recipe) => { if (allowRecipe(recipe.id)) selectedId.value = recipe.id }
const goToRecipe = (recipe) => {
  if (!recipe) return
  selectedId.value = allowRecipe(recipe.id) ? recipe.id : null
}
const selectedRecipe = computed(() => (selectedId.value === null ? null : recipes.value.find(r => r.id === selectedId.value) || null))
const selectedIndex = computed(() => (selectedRecipe.value ? chefRecipes.value.findIndex(r => r.id === selectedRecipe.value.id) : -1))
const previousRecipe = computed(() => (selectedIndex.value > 0 ? chefRecipes.value[selectedIndex.value - 1] : null))
const nextRecipe = computed(() => {
  const i = selectedIndex.value
  return i >= 0 && i < chefRecipes.value.length - 1 ? chefRecipes.value[i + 1] : null
})

// Another chef (e.g. from the followers list) or a login / logout: reload the page content.
// (Declared last: the immediate watcher uses the refs defined above.)
watch(profileId, () => {
  loadingProfile.value = true
  openList.value = null
  selectedId.value = null
  followError.value = ''
  loadProfile()
}, { immediate: true })
watch(token, loadProfile)
</script>

<style scoped>
.stat-box { display: flex; flex-direction: column; align-items: center; min-width: 5.5rem; padding: 0.6rem 1rem; border-radius: 1rem; background: #fff7ed; border: 1.5px solid #ffedd5; }
.stat-number { font-size: 1.25rem; font-weight: 800; color: #7c2d12; line-height: 1.2; }
.stat-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; }
.stat-button { cursor: pointer; transition: border-color 0.15s, background 0.15s; }
.stat-button:hover { border-color: #fb923c; }
.stat-active { border-color: #f97316; background: #ffedd5; }
</style>
