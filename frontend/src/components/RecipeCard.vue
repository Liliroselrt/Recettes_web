<template>
  <article @click="$emit('open', recipe)" class="recipe-card group bg-white rounded-3xl overflow-hidden border border-orange-100 shadow-sm flex flex-col justify-between">
    <div>
      <!-- Card picture -->
      <RecipeCarousel :recipe="recipe" height-class="h-48 bg-brand-900" lazy>
        <!-- Category Badge -->
        <span class="badge badge-light absolute top-4 left-4">{{ recipe.category }}</span>

        <!-- Shared / Private badge (own recipes only) -->
        <span v-if="isOwner(recipe)" class="badge absolute bottom-4 left-4" :class="recipe.shared ? 'badge-shared' : 'badge-private'">
          <i :class="recipe.shared ? 'fa-solid fa-earth-europe' : 'fa-solid fa-lock'" class="mr-1.5"></i>{{ recipe.shared ? 'Shared' : 'Private' }}
        </span>

        <!-- Favorite Toggle Button -->
        <button @click.stop="onFavorite" class="fav-btn absolute top-4 right-4" :aria-label="recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'">
          <i :class="recipe.isFavorite ? 'fa-solid fa-heart text-lg' : 'fa-regular fa-heart text-lg'"></i>
        </button>
      </RecipeCarousel>

      <!-- Card Content -->
      <div class="p-6">
        <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span class="flex items-center font-medium">
            <i class="fa-regular fa-clock text-brand-500 mr-1.5"></i> {{ recipe.prepTime }} min
          </span>
          <span class="flex items-center text-rose-500 font-semibold" title="Favorites">
            <i class="fa-solid fa-heart mr-1"></i> {{ totalFavorites(recipe) }}
          </span>
          <span class="flex items-center text-amber-500 font-bold" title="Average rating">
            <i class="fa-solid fa-star mr-1"></i> {{ ratingLabel(recipe) }}<span v-if="recipe.reviews.length" class="ml-1">({{ recipe.reviews.length }})</span>
          </span>
        </div>

        <h3 class="text-xl font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-brand-600 transition-colors">
          {{ recipe.title }}
        </h3>

        <!-- Exact date and time (set automatically when the recipe is shared) -->
        <p class="text-xs text-slate-400 mb-3 truncate" :title="recipeTimeLabel(recipe, true)">
          <i :class="recipe.shared ? 'fa-regular fa-calendar-check' : 'fa-solid fa-lock'" class="mr-1"></i>{{ recipeTimeLabel(recipe) }}
        </p>

        <!-- Latest community comment -->
        <div class="card-comment">
          <template v-if="latestReview(recipe)">
            <p class="text-sm text-slate-600 italic line-clamp-2 leading-relaxed">“{{ latestReview(recipe).comment }}”</p>
            <p class="text-xs text-slate-500 mt-1">
              <strong class="font-semibold text-slate-700">{{ latestReview(recipe).author }}</strong>
              <span class="text-amber-500 font-bold ml-1.5"><i class="fa-solid fa-star mr-0.5"></i>{{ latestReview(recipe).rating }}/5</span>
            </p>
          </template>
          <p v-else class="text-sm text-slate-400 italic">No reviews yet. Be the first to leave one!</p>
        </div>

        <!-- Pantry match (only when ingredients are ticked in My Pantry) -->
        <p v-if="pantryCount > 0" class="match" :class="match.canMake ? 'match-ok' : 'match-warn'" :title="pantryMatchText(recipe)">
          <i :class="match.canMake ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'" class="mr-1.5"></i>{{ match.canMake ? 'You have everything' : pantryMatchText(recipe) }}
        </p>
      </div>
    </div>

    <!-- Card Footer & Actions (every button uses .stop so it does not also open the recipe) -->
    <div class="px-6 pb-6 pt-4 border-t border-orange-50 flex flex-wrap items-center justify-between gap-3">
      <!-- Click the author to open their profile -->
      <RouterLink :to="`/users/${recipe.userId}`" @click.stop class="group/author flex items-center space-x-2 text-xs text-slate-500" :title="`See the profile of ${recipe.author}`">
        <UserAvatar :name="recipe.author" :src="recipe.authorAvatar" size="xs" />
        <span>By <strong class="text-slate-700 font-semibold group-hover/author:text-brand-600 group-hover/author:underline">{{ recipe.author }}</strong></span>
      </RouterLink>

      <div class="flex items-center gap-2">
        <button @click.stop="$emit('open', recipe)" class="btn btn-secondary btn-sm">
          <i class="fa-regular fa-eye"></i> View
        </button>
        <template v-if="isOwner(recipe)">
          <button @click.stop="onShare" class="btn btn-sm" :class="recipe.shared ? 'btn-secondary' : 'btn-primary'" :disabled="isRestricted && !recipe.shared" :title="isRestricted && !recipe.shared ? 'Your account is suspended: you cannot share recipes' : ''">
            <i :class="recipe.shared ? 'fa-solid fa-eye-slash' : 'fa-solid fa-share-nodes'"></i> {{ recipe.shared ? 'Unshare' : 'Share' }}
          </button>
          <button @click.stop="openEdit(recipe)" title="Edit" aria-label="Edit recipe" class="btn btn-secondary btn-icon btn-sm">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button @click.stop="onDelete" title="Delete" aria-label="Delete recipe" class="btn btn-danger btn-icon btn-sm">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </template>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import RecipeCarousel from './RecipeCarousel.vue'
import UserAvatar from './UserAvatar.vue'
import { useRecipes } from '../composables/useRecipes'
import { usePantry } from '../composables/usePantry'
import { useUI } from '../composables/useUI'
import { useRoles } from '../composables/useRoles'
import { useAuth } from '../composables/useAuth'
import { recipeTimeLabel } from '../utils/recipes'

const props = defineProps({
  recipe: { type: Object, required: true }
})
defineEmits(['open'])

const { isOwner, totalFavorites, ratingLabel, latestReview, toggleFavorite, toggleShare, deleteRecipe } = useRecipes()
const { pantryCount, pantryMatch, pantryMatchText } = usePantry()
const { openAuth, openEdit } = useUI()
const { isLoggedIn } = useAuth()
const { isRestricted } = useRoles()

const match = computed(() => pantryMatch(props.recipe))

const run = async (action) => {
  try { await action() } catch (e) { alert(e.message) }
}

// Favorites need an account
const onFavorite = () => (isLoggedIn.value ? run(() => toggleFavorite(props.recipe)) : openAuth())
const onShare = () => run(() => toggleShare(props.recipe))
const onDelete = () => {
  if (confirm(`Delete "${props.recipe.title}"? This cannot be undone.`)) run(() => deleteRecipe(props.recipe.id))
}
</script>
