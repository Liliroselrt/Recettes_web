<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900"><i class="fa-solid fa-clock-rotate-left text-brand-500 mr-2"></i>Cooking history</h1>
      <p class="text-slate-500 text-sm mt-1">Every recipe you marked as cooked, most recent first.</p>
    </div>

    <!-- Logged out -->
    <div v-if="!isLoggedIn" class="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-amber-200 my-8">
      <h3 class="text-xl font-bold text-slate-900 mb-2">Log in to see your history</h3>
      <p class="text-slate-500 mb-6">Tap "I cooked this" in a recipe to keep track of what you have made.</p>
      <button type="button" class="btn btn-primary btn-lg" @click="openAuth"><i class="fa-solid fa-user"></i> Log in</button>
    </div>

    <p v-else-if="loading" class="text-center text-slate-500 py-16">
      <i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading your history...
    </p>
    <div v-else-if="error" class="alert-error my-8">
      {{ error }} <button type="button" class="underline font-bold ml-2" @click="load">Try again</button>
    </div>

    <template v-else>
      <div v-if="entries.length" class="flex flex-wrap gap-3 mb-8">
        <div class="stat-box"><span class="stat-number">{{ entries.length }}</span><span class="stat-label">Time{{ entries.length === 1 ? '' : 's' }} cooked</span></div>
        <div class="stat-box"><span class="stat-number">{{ distinctCount }}</span><span class="stat-label">Different recipe{{ distinctCount === 1 ? '' : 's' }}</span></div>
      </div>

      <p v-if="actionError" role="alert" class="alert-error mb-4">{{ actionError }}</p>

      <div v-for="group in groups" :key="group.label" class="mb-8">
        <h2 class="field-label mb-3">{{ group.label }}</h2>
        <ul class="space-y-3">
          <li v-for="entry in group.items" :key="entry.id" class="panel p-4 flex gap-4 items-center">
            <img :src="imgSrc(entry.image) || DEFAULT_IMAGE" alt="" class="w-20 h-20 rounded-2xl object-cover flex-none bg-brand-100" @error="onThumbError">

            <div class="min-w-0 flex-1">
              <button v-if="recipeFor(entry)" type="button" class="font-bold text-slate-900 hover:text-brand-600 text-left truncate max-w-full block" @click="selectedId = entry.recipeId">
                {{ entry.title }}
              </button>
              <p v-else class="font-bold text-slate-900 truncate">
                {{ entry.title }} <span class="tag ml-1" title="This recipe was deleted or is no longer visible">No longer available</span>
              </p>
              <p class="text-xs text-slate-500 mt-0.5" :title="formatDateTime(entry.cookedAt, true)">
                <i class="fa-regular fa-calendar-check mr-1"></i>{{ formatDateTime(entry.cookedAt) }} · {{ timeAgo(entry.cookedAt) }}
              </p>
              <p v-if="entry.note" class="text-sm text-slate-600 italic mt-1.5 break-words">“{{ entry.note }}”</p>
            </div>

            <div class="flex items-center gap-2 flex-none">
              <button v-if="recipeFor(entry)" type="button" class="btn btn-secondary btn-sm" @click="selectedId = entry.recipeId">
                <i class="fa-solid fa-rotate-right"></i> <span class="hidden sm:inline">Cook again</span>
              </button>
              <button type="button" class="btn btn-danger btn-icon btn-sm" title="Remove from my history" aria-label="Remove from my history" @click="removeEntry(entry)">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Empty state -->
      <div v-if="entries.length === 0" class="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-amber-200 my-8">
        <div class="w-20 h-20 bg-amber-100 text-brand-500 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
          <i class="fa-solid fa-utensils"></i>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-2">Nothing cooked yet</h3>
        <p class="text-slate-500 max-w-md mx-auto mb-6">Open a recipe and tap "I cooked this": it will show up here.</p>
        <RouterLink to="/" class="btn btn-primary btn-lg"><i class="fa-solid fa-house"></i> Browse the recipes</RouterLink>
      </div>
    </template>

    <RecipeModal v-if="selectedRecipe" :recipe="selectedRecipe" @close="closeRecipe" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import RecipeModal from '../components/RecipeModal.vue'
import { apiFetch } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { useUI } from '../composables/useUI'
import { useRecipes } from '../composables/useRecipes'
import { useImages } from '../composables/useImages'
import { DEFAULT_IMAGE, imgSrc, formatDateTime, timeAgo } from '../utils/recipes'

const { token, isLoggedIn } = useAuth()
const { openAuth } = useUI()
const { recipes } = useRecipes()
const { onThumbError } = useImages()

const entries = ref([])
const loading = ref(true)
const error = ref('')
const actionError = ref('')
const selectedId = ref(null)

async function load() {
  if (!token.value) { entries.value = []; loading.value = false; return }
  try {
    const data = await apiFetch('/users/me/history')
    entries.value = data.entries
    error.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
watch(token, load, { immediate: true })

const distinctCount = computed(() => new Set(entries.value.map(e => (e.recipeId !== null ? `r${e.recipeId}` : `t${e.title}`))).size)

// Entries grouped by month
const groups = computed(() => {
  const byMonth = new Map()
  entries.value.forEach(entry => {
    const label = new Date(entry.cookedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!byMonth.has(label)) byMonth.set(label, [])
    byMonth.get(label).push(entry)
  })
  return [...byMonth].map(([label, items]) => ({ label, items }))
})

// The recipe of an entry, if it still exists and the person can still see it
const recipeFor = (entry) => (entry.recipeId === null ? null : recipes.value.find(r => r.id === entry.recipeId) || null)
const selectedRecipe = computed(() => (selectedId.value === null ? null : recipes.value.find(r => r.id === selectedId.value) || null))

// Cooking it again from the window adds a new entry: reload when it closes
function closeRecipe() {
  selectedId.value = null
  load()
}

async function removeEntry(entry) {
  if (!confirm(`Remove "${entry.title}" (${formatDateTime(entry.cookedAt)}) from your history?`)) return
  actionError.value = ''
  try {
    await apiFetch(`/users/me/history/${entry.id}`, { method: 'DELETE' })
    entries.value = entries.value.filter(e => e.id !== entry.id)
  } catch (e) {
    actionError.value = e.message
  }
}
</script>

<style scoped>
.stat-box { display: flex; flex-direction: column; align-items: center; min-width: 6.5rem; padding: 0.6rem 1rem; border-radius: 1rem; background: #fff7ed; border: 1.5px solid #ffedd5; }
.stat-number { font-size: 1.25rem; font-weight: 800; color: #7c2d12; line-height: 1.2; }
.stat-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; }
</style>
