<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900"><i class="fa-solid fa-user-group text-brand-500 mr-2"></i>Community</h1>
      <p class="text-slate-500 text-sm mt-1">Find other users, follow the ones you like and start a chat with them.</p>
    </div>

    <p v-if="actionError" role="alert" class="alert-error mb-4">{{ actionError }}</p>

    <!-- Search for users -->
    <section class="panel p-5 sm:p-6 mb-8" aria-labelledby="people-search-title">
      <h2 id="people-search-title" class="field-label">Find users</h2>
      <div class="relative">
        <i class="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-400"></i>
        <input v-model="query" type="search" maxlength="50" placeholder="Search by username..." aria-label="Search for a user by username" class="field pl-11">
      </div>

      <div class="mt-3" aria-live="polite">
        <p v-if="searching" class="text-sm text-slate-500 px-1 py-2"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Searching...</p>
        <p v-else-if="searchError" role="alert" class="text-sm text-rose-600 px-1 py-2">{{ searchError }}</p>
        <p v-else-if="query.trim() && searched && results.length === 0" class="text-sm text-slate-500 px-1 py-2">No user found for “{{ query.trim() }}”.</p>
        <template v-else-if="shownPeople.length">
          <p v-if="!query.trim()" class="text-xs font-bold uppercase tracking-wide text-slate-400 px-1 mb-1">Users you may like</p>
          <!-- 5 people are visible, scroll down to see the next ones -->
          <ul class="people-scroll divide-y divide-orange-50" aria-label="Users">
            <PersonRow v-for="person in shownPeople" :key="person.id" :person="person" :is-following="followingIds.has(person.id)" :busy="busyId === person.id" @toggle="toggle" />
          </ul>
        </template>
      </div>
    </section>

    <!-- People I follow -->
    <section aria-labelledby="following-title">
      <h2 id="following-title" class="text-lg font-bold text-slate-900 mb-3">
        Following <span v-if="isLoggedIn && !loading" class="text-slate-400 font-semibold">({{ following.length }})</span>
      </h2>

      <!-- Filter and sort my list -->
      <div v-if="isLoggedIn && !loading && following.length > 1" class="flex flex-wrap items-center gap-2 mb-3">
        <div class="relative grow sm:grow-0">
          <i class="fa-solid fa-filter absolute left-3 top-2.5 text-slate-400 text-xs"></i>
          <input v-model="listFilter" type="search" maxlength="50" class="field field-sm pl-8" placeholder="Filter my list..." aria-label="Filter the people I follow">
        </div>
        <select v-model="listSort" class="field field-sm field-auto font-semibold" aria-label="Sort the people I follow">
          <option value="recent">Recently followed</option>
          <option value="az">A to Z</option>
        </select>
      </div>

      <div v-if="!isLoggedIn" class="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-amber-200">
        <p class="text-slate-500 mb-5">Log in to follow users and see them here.</p>
        <button type="button" class="btn btn-primary btn-lg" @click="openAuth"><i class="fa-solid fa-user"></i> Log in</button>
      </div>
      <p v-else-if="loading" class="text-center text-slate-500 py-10"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</p>
      <div v-else-if="loadError" class="alert-error">
        {{ loadError }} <button type="button" class="underline font-bold ml-2" @click="loadFollowing">Try again</button>
      </div>
      <div v-else-if="following.length === 0" class="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-amber-200">
        <div class="w-16 h-16 bg-amber-100 text-brand-500 rounded-full flex items-center justify-center mx-auto text-2xl mb-3">
          <i class="fa-solid fa-user-plus"></i>
        </div>
        <p class="text-slate-500">You do not follow anyone yet. Use the search above, or open a user's profile from any recipe.</p>
      </div>
      <ul v-else class="panel p-2 divide-y divide-orange-50">
        <PersonRow v-for="person in visibleFollowing" :key="person.id" :person="person" :is-following="true" :busy="busyId === person.id" @toggle="toggle" />
        <li v-if="visibleFollowing.length === 0" class="text-sm text-slate-500 text-center py-6">Nobody in your list matches “{{ listFilter.trim() }}”.</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import PersonRow from '../components/PersonRow.vue'
import { apiFetch } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { useUI } from '../composables/useUI'

const { token, userId, isLoggedIn } = useAuth()
const { openAuth } = useUI()

// ----- People I follow -----
const following = ref([])   // [{ id, username, avatarUrl, specialty, location }]
const loading = ref(true)
const loadError = ref('')
const followingIds = computed(() => new Set(following.value.map(p => p.id)))

// Filter and sort of the list (the server sends the most recently followed first)
const listFilter = ref('')
const listSort = ref('recent')   // 'recent' | 'az'
const visibleFollowing = computed(() => {
  const q = listFilter.value.trim().toLowerCase()
  const list = q ? following.value.filter(p => p.username.toLowerCase().includes(q)) : [...following.value]
  if (listSort.value === 'az') list.sort((a, b) => a.username.localeCompare(b.username))
  return list
})

async function loadFollowing() {
  if (!token.value) { following.value = []; loading.value = false; return }
  loading.value = true
  try {
    following.value = await apiFetch(`/users/${userId.value}/following`)
    loadError.value = ''
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}
watch(token, loadFollowing, { immediate: true })

// ----- Follow / unfollow (same button in the search results and in the list) -----
const busyId = ref(null)
const actionError = ref('')

async function toggle(person) {
  if (!isLoggedIn.value) return openAuth()
  busyId.value = person.id
  actionError.value = ''
  const follow = !followingIds.value.has(person.id)
  try {
    await apiFetch(`/users/${person.id}/follow`, { method: 'POST', body: { following: follow } })
    if (follow) {
      const { id, username, avatarUrl, specialty, location } = person
      following.value.unshift({ id, username, avatarUrl, specialty, location })
    } else {
      following.value = following.value.filter(p => p.id !== person.id)
    }
  } catch (e) {
    actionError.value = e.message
  } finally {
    busyId.value = null
  }
}

// ----- Search (waits for a short pause in the typing) -----
const query = ref('')
const results = ref([])
const searching = ref(false)
const searched = ref(false)
const searchError = ref('')
const suggestions = ref([])   // shown while the search box is empty
const shownPeople = computed(() => (query.value.trim() ? results.value : suggestions.value))
let searchTimer = null
let searchSeq = 0   // an older answer never replaces a newer one

async function runSearch(text) {
  const seq = ++searchSeq
  try {
    const data = await apiFetch(`/users/search?q=${encodeURIComponent(text)}`)
    if (seq !== searchSeq) return
    results.value = data
    searchError.value = ''
    searched.value = true
  } catch (e) {
    if (seq === searchSeq) searchError.value = e.message
  } finally {
    if (seq === searchSeq) searching.value = false
  }
}

async function loadSuggestions() {
  try {
    suggestions.value = await apiFetch('/users/search?q=')
  } catch (e) {
    suggestions.value = []   // not critical: the search box still works
  }
}
// At the opening, and again after logging in or out (the list depends on who I follow)
watch(token, loadSuggestions, { immediate: true })

watch(query, (value) => {
  clearTimeout(searchTimer)
  const text = value.trim()
  if (!text) {
    searchSeq++
    results.value = []
    searched.value = false
    searching.value = false
    searchError.value = ''
    return
  }
  searching.value = true
  searchTimer = setTimeout(() => runSearch(text), 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>
