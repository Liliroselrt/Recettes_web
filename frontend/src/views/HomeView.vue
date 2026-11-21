<template>
  <div>
    <!-- Hero / Banner Section -->
    <div class="relative overflow-hidden bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 text-white rounded-3xl p-8 sm:p-12 mb-10 shadow-xl">
      <div class="relative z-10 max-w-2xl">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/30 text-brand-300 border border-brand-500/40 mb-4">
          <i class="fa-solid fa-fire-flame-curved mr-2"></i> Culinary platform 2.0
        </span>
        <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4">
          Share your delights, inspire the community.
        </h1>
        <p class="text-slate-300 text-base sm:text-lg mb-6">
          Explore hundreds of handcrafted recipes, save your favorites and become the chef of your own cookbook.
        </p>

        <!-- Search & Filter Bar inside Hero -->
        <div class="flex flex-col sm:flex-row gap-3 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/20">
          <div class="relative flex-grow">
            <i class="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-400"></i>
            <input v-model="searchQuery" type="text" placeholder="Search for a dish or an ingredient..." aria-label="Search for a dish or an ingredient" class="w-full pl-11 pr-4 py-2.5 bg-white/95 text-slate-800 placeholder-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium">
          </div>
          <select v-model="selectedCategory" aria-label="Category" class="bg-white/95 text-slate-800 font-medium px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">All categories</option>
            <option value="Starter">Starters</option>
            <option value="Main">Main Courses</option>
            <option value="Dessert">Desserts</option>
          </select>
        </div>
      </div>
      <div class="absolute -right-10 -bottom-10 opacity-20 pointer-events-none text-brand-500 text-[260px] leading-none">
        <i class="fa-solid fa-bowl-food"></i>
      </div>
    </div>

    <!-- Page Titles Depending on Active Tab -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">
          <span v-if="currentTab === 'home'">All Recipes</span>
          <span v-else>My Creations</span>
        </h2>
        <p class="text-slate-500 text-sm mt-1">
          {{ filteredRecipes.length }} recipe(s) available
          <span v-if="currentTab === 'my-creations'"> · Private recipes stay with you until you share them.</span>
        </p>
      </div>

      <!-- Dish types + two quick filters -->
      <div class="flex flex-wrap items-center gap-2">
        <button v-for="cat in CATEGORIES" :key="cat.value" @click="selectedCategory = cat.value" :class="categoryPillStyle(cat.value)">
          {{ cat.emoji }} {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- Toolbar: sorting + pantry toggle -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-2">
        <label for="sort-select" class="field-label mb-0">Sort by</label>
        <select id="sort-select" v-model="sortBy" class="field field-sm field-auto font-semibold">
          <option value="recent">Most recent</option>
          <option value="trending">Trending</option>
          <option value="top-rated">Top rated</option>
          <option value="most-reviewed">Most reviewed</option>
          <option value="quickest">Quickest (under 20 min)</option>
          <option value="most-favorited">Most favorited</option>
          <option v-if="isLoggedIn && following.length > 0" value="followed-first">Chefs I follow first</option>
          <option v-if="pantryCount > 0" value="best-match">Best pantry match</option>
        </select>
      </div>
      <button @click="showPantry = !showPantry" :aria-expanded="showPantry" class="btn btn-lg" :class="showPantry || pantryCount > 0 ? 'btn-primary' : 'btn-secondary'">
        <i class="fa-solid fa-basket-shopping"></i>
        <span>My Pantry</span>
        <span v-if="pantryCount > 0" class="bg-white text-brand-600 text-xs font-bold px-2 py-0.5 rounded-full">{{ pantryCount }}</span>
        <i :class="showPantry ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-xs"></i>
      </button>
    </div>

    <!-- Filters: chefs I follow, recipes with a video -->
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <template v-if="isLoggedIn && currentTab !== 'my-creations'">
        <span class="field-label mb-0 mr-1">Chefs</span>
        <button type="button" :class="chefScope === 'all' ? 'pill pill-active' : 'pill'" :aria-pressed="chefScope === 'all'" @click="chefScope = 'all'">Everyone</button>
        <button type="button" :class="chefScope === 'following' ? 'pill pill-active' : 'pill'" :aria-pressed="chefScope === 'following'" @click="chefScope = 'following'">
          <i class="fa-solid fa-user-group mr-1"></i> People I follow ({{ following.length }})
        </button>
        <select v-if="chefScope === 'following' && following.length > 0" v-model="chefId" class="field field-sm field-auto font-semibold" aria-label="Show the recipes of one chef I follow">
          <option value="">All the chefs I follow</option>
          <option v-for="p in followingByName" :key="p.id" :value="String(p.id)">{{ p.username }}</option>
        </select>
        <span class="mx-1 text-slate-300 hidden sm:inline">|</span>
      </template>
      <!-- Only what I can cook with the ingredients ticked in My Pantry -->
      <button type="button" :class="canMakeActive ? 'pill pill-active' : 'pill'" :aria-pressed="canMakeActive" title="Only the recipes I can make with the ingredients of My Pantry" @click="toggleCookable">
        🧺 What I can cook
      </button>
      <!-- Only my favorite recipes (there is no separate Favorites page anymore) -->
      <button type="button" :class="onlyFavorites ? 'pill pill-active' : 'pill'" :aria-pressed="onlyFavorites" title="Only my favorite recipes" @click="toggleFavorites">
        ❤️ My favorites<span v-if="isLoggedIn"> ({{ favoriteCount }})</span>
      </button>
      <button type="button" :class="onlyVideo ? 'pill pill-active' : 'pill'" :aria-pressed="onlyVideo" @click="onlyVideo = !onlyVideo">
        <i class="fa-solid fa-video mr-1"></i> With video
      </button>
    </div>

    <PantryPanel v-if="showPantry" @clear="onClearPantry" />

    <!-- Loading / server error -->
    <p v-if="loading" class="text-center text-slate-500 py-16">
      <i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading recipes...
    </p>
    <div v-else-if="error" class="alert-error my-8">
      {{ error }}
      <button @click="fetchRecipes" class="underline font-bold ml-2">Try again</button>
    </div>

    <!-- Recipe Grid -->
    <div v-else-if="filteredRecipes.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      <RecipeCard v-for="recipe in filteredRecipes" :key="recipe.id" :recipe="recipe" @open="openRecipeDetail" />
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-amber-200 my-8">
      <div class="w-20 h-20 bg-amber-100 text-brand-500 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
        <i class="fa-solid fa-cookie-bite"></i>
      </div>
      <h3 class="text-xl font-bold text-slate-900 mb-2">No recipes found</h3>
      <p class="text-slate-500 max-w-md mx-auto mb-6">{{ emptyMessage }}</p>
      <button @click="openCreate" class="btn btn-primary btn-lg">
        <i class="fa-solid fa-plus"></i> Add a recipe
      </button>
    </div>

    <!-- Recipe detail window -->
    <RecipeModal
      v-if="selectedRecipe"
      :recipe="selectedRecipe"
      :previous="previousRecipe"
      :next="nextRecipe"
      :index="selectedIndex"
      :total="filteredRecipes.length"
      @close="selectedId = null"
      @navigate="goToRecipe"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import RecipeCard from '../components/RecipeCard.vue'
import RecipeModal from '../components/RecipeModal.vue'
import { useGuestLimit } from '../composables/useGuestLimit'
import PantryPanel from '../components/PantryPanel.vue'
import { useRecipes } from '../composables/useRecipes'
import { usePantry } from '../composables/usePantry'
import { useAuth } from '../composables/useAuth'
import { useFollowing } from '../composables/useFollowing'
import { useUI } from '../composables/useUI'
import { CATEGORIES } from '../utils/recipes'

const route = useRoute()
const { isLoggedIn } = useAuth()
const { openCreate, openAuth } = useUI()
const { recipes, loading, error, fetchRecipes, isOwner, totalFavorites, averageRating, favoriteCount } = useRecipes()
const { pantryCount, onlyCookable, pantryMatch, clearPantry } = usePantry()
const { following, followingIds, loadFollowing } = useFollowing()

// 'home' | 'my-creations' (defined by the route)
const currentTab = computed(() => route.meta.tab)

const searchQuery = ref('')
const selectedCategory = ref('')    // '' | 'Starter' | 'Main' | 'Dessert'
const sortBy = ref('recent')        // 'recent' | 'trending' | 'top-rated' | 'most-reviewed' | 'quickest' | 'best-match'
const showPantry = ref(false)
const QUICK_MINUTES = 20           // "Quickest" keeps the recipes under this duration
const chefScope = ref('all')      // 'all' | 'following'
const chefId = ref('')            // '' = all the chefs I follow, otherwise the id of one of them
const onlyVideo = ref(false)
const onlyFavorites = ref(false)

// "What I can cook": uses the ingredients ticked in My Pantry. With an empty pantry, the pantry opens instead.
const canMakeActive = computed(() => onlyCookable.value && pantryCount.value > 0)
const toggleCookable = () => {
  if (pantryCount.value === 0) { showPantry.value = true; return }
  onlyCookable.value = !onlyCookable.value
}
const toggleFavorites = () => {
  if (!isLoggedIn.value) return openAuth()   // favorites belong to an account
  onlyFavorites.value = !onlyFavorites.value
}
const followingByName = computed(() => [...following.value].sort((a, b) => a.username.localeCompare(b.username)))

// The list may have changed since the last visit (follow / unfollow on a profile)
onMounted(() => { if (isLoggedIn.value) loadFollowing() })

// Logging out, or no longer following anyone: back to the normal list and sorting
watch(isLoggedIn, (ok) => {
  if (ok) return
  chefScope.value = 'all'
  onlyFavorites.value = false
  if (sortBy.value === 'followed-first') sortBy.value = 'recent'
})
watch(chefScope, (scope) => { if (scope === 'all') chefId.value = '' })
watch(following, (list) => {
  if (chefId.value && !list.some(p => String(p.id) === chefId.value)) chefId.value = ''
  if (list.length === 0 && sortBy.value === 'followed-first') sortBy.value = 'recent'
})
const selectedId = ref(null)

const categoryPillStyle = (cat) => (selectedCategory.value === cat ? 'pill pill-active' : 'pill')

// Changing tab closes the open recipe
watch(currentTab, () => { selectedId.value = null })

// When the last pantry item is removed, "Best pantry match" is no longer available
watch(pantryCount, (count) => { if (count === 0 && sortBy.value === 'best-match') sortBy.value = 'recent' })

const onClearPantry = () => {
  clearPantry()
  if (sortBy.value === 'best-match') sortBy.value = 'recent'
}

// ----- Sorting -----
const sortTime = (recipe) => new Date(recipe.sharedAt || recipe.createdAt).getTime()

// Trending = favorites and reviews (reviews count double), divided by the age of the
// recipe in weeks, so a recently shared recipe with lots of activity ranks first.
const trendingScore = (recipe) => {
  const ageDays = Math.max(0, (Date.now() - sortTime(recipe)) / 86400000)
  const activity = totalFavorites(recipe) + 2 * recipe.reviews.length
  return activity / (1 + ageDays / 7)
}

const sortRecipes = (list) => {
  const sorted = [...list]
  const byRecent = (a, b) => sortTime(b) - sortTime(a)

  switch (sortBy.value) {
    case 'trending':
      sorted.sort((a, b) => trendingScore(b) - trendingScore(a) || byRecent(a, b))
      break
    case 'top-rated':
      // Recipes without any review go last
      sorted.sort((a, b) =>
        (averageRating(b) ?? -1) - (averageRating(a) ?? -1) ||
        b.reviews.length - a.reviews.length || byRecent(a, b))
      break
    case 'most-reviewed':
      sorted.sort((a, b) => b.reviews.length - a.reviews.length || byRecent(a, b))
      break
    case 'quickest':
      sorted.sort((a, b) => a.prepTime - b.prepTime || byRecent(a, b))
      break
    case 'most-favorited':
      sorted.sort((a, b) => totalFavorites(b) - totalFavorites(a) || byRecent(a, b))
      break
    case 'followed-first': {
      // Recipes of the people I follow first, each group from the most recent
      const followed = (r) => (followingIds.value.has(r.userId) ? 1 : 0)
      sorted.sort((a, b) => followed(b) - followed(a) || byRecent(a, b))
      break
    }
    case 'best-match':
      if (pantryCount.value > 0) {
        const score = (r) => { const m = pantryMatch(r); return m.total ? m.matched / m.total : 1 }
        sorted.sort((a, b) => score(b) - score(a) || byRecent(a, b))
        break
      }
      sorted.sort(byRecent)
      break
    default:
      sorted.sort(byRecent)
  }
  return sorted
}

const filteredRecipes = computed(() => {
  const query = searchQuery.value.toLowerCase()
  const pantryFilterOn = onlyCookable.value && pantryCount.value > 0

  const list = recipes.value.filter(r => {
    const matchesTab =
      (currentTab.value === 'home' && r.shared) ||
      (currentTab.value === 'my-creations' && isOwner(r))

    const matchesSearch = r.title.toLowerCase().includes(query) ||
      r.ingredients.some(ing => ing.name.toLowerCase().includes(query))

    const matchesCat = !selectedCategory.value || r.category === selectedCategory.value
    const matchesPantry = !pantryFilterOn || pantryMatch(r).canMake
    const matchesFavorite = !onlyFavorites.value || r.isFavorite
    // "Quickest": every recipe that takes less than 20 minutes (sorted from the fastest below)
    const matchesQuick = sortBy.value !== 'quickest' || Number(r.prepTime) < QUICK_MINUTES
    const matchesVideo = !onlyVideo.value || r.hasVideo

    // "People I follow": all of them, or just the chef picked in the list (not used on "My Creations")
    const matchesChef = currentTab.value === 'my-creations' || chefScope.value !== 'following' ||
      (chefId.value ? String(r.userId) === chefId.value : followingIds.value.has(r.userId))

    return matchesTab && matchesSearch && matchesCat && matchesPantry && matchesFavorite && matchesQuick && matchesVideo && matchesChef
  })

  return sortRecipes(list)
})

// ----- Recipe window: previous / next follow the list currently displayed -----
const { allowRecipe } = useGuestLimit()
const openRecipeDetail = (recipe) => { if (allowRecipe(recipe.id)) selectedId.value = recipe.id }
const goToRecipe = (recipe) => {
  if (!recipe) return
  if (allowRecipe(recipe.id)) selectedId.value = recipe.id
  else selectedId.value = null   // limite atteinte : la fenêtre de connexion s'ouvre
}

const selectedRecipe = computed(() =>
  selectedId.value === null ? null : recipes.value.find(r => r.id === selectedId.value) || null)
const selectedIndex = computed(() =>
  selectedRecipe.value ? filteredRecipes.value.findIndex(r => r.id === selectedRecipe.value.id) : -1)
const previousRecipe = computed(() =>
  selectedIndex.value > 0 ? filteredRecipes.value[selectedIndex.value - 1] : null)
const nextRecipe = computed(() => {
  const i = selectedIndex.value
  return i >= 0 && i < filteredRecipes.value.length - 1 ? filteredRecipes.value[i + 1] : null
})

// Message shown when no recipe matches
const emptyMessage = computed(() => {
  if (chefScope.value === 'following' && currentTab.value !== 'my-creations') {
    return following.value.length === 0
      ? 'You do not follow anyone yet. Open a cook\'s profile (or the People I follow page) to follow cooks and see their recipes here.'
      : 'No recipe from the people you follow matches your search. Try another chef, or switch back to Everyone.'
  }
  if (sortBy.value === 'quickest') return 'No recipe under 20 minutes matches your search. Choose another sorting to see more.'
  if (onlyFavorites.value) return 'None of your favorites matches your search. Tap the heart on a recipe to save it, or turn off “My favorites”.'
  if (onlyVideo.value) return 'No recipe with a video matches your search. Turn off “With video” to see more.'
  if (onlyCookable.value && pantryCount.value > 0) {
    return 'No recipe matches your pantry yet. Tick more ingredients or turn off "Only recipes I can make".'
  }
  if (currentTab.value === 'my-creations') {
    return isLoggedIn.value
      ? 'You have not created any recipe yet. Create one, then share it with the community when it is ready.'
      : 'Log in to create recipes and find them here.'
  }
  return 'Try changing your search or add your own recipe to enrich the community cookbook.'
})
</script>
