<template>
  <div class="recipe-detail" v-if="recipe">
    <RouterLink to="/" class="back-link">← Retour aux recettes</RouterLink>
    
    <div class="recipe-card-full">
      <span class="badge">{{ recipe.category }}</span>
      <h1>{{ recipe.title }}</h1>
      <p class="meta">⏱️ Temps de préparation : {{ recipe.prep_time }} min • Publié par <strong>{{ recipe.author_name }}</strong></p>

      <div class="content-grid">
        <div class="ingredients">
          <h3>Ingrédients</h3>
          <ul>
            <li v-for="(item, index) in formattedIngredients" :key="index">{{ item }}</li>
          </ul>
        </div>
        <div class="instructions">
          <h3>Préparation</h3>
          <p style="white-space: pre-line;">{{ recipe.instructions }}</p>
        </div>
      </div>
    </div>

    <CommentSection :recipeId="recipe.id" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CommentSection from '../components/CommentSection.vue'

const route = useRoute()
const recipe = ref(null)

onMounted(async () => {
  try {
    const response = await fetch('http://localhost:3000/api/recipes')
    const data = await response.json()
    const found = data.find(r => r.id === Number(route.params.id))

    if (found) {
      recipe.value = {
        ...found,
        prep_time: found.prepTime,
        author_name: found.User ? found.User.username : 'Chef anonyme'
      }
    }
  } catch (error) {
    console.error('Erreur chargement détail recette :', error)
  }
})

const formattedIngredients = computed(() => {
  if (!recipe.value || !recipe.value.ingredients) return []
  return recipe.value.ingredients.split('\n').filter(line => line.trim() !== '')
})
</script>

<style scoped>
.back-link { display: inline-block; margin-bottom: 1rem; color: #ff6b6b; text-decoration: none; font-weight: bold; }
.recipe-card-full { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.badge { background: #ffe3e3; color: #ff6b6b; padding: 0.3rem 0.8rem; border-radius: 12px; font-weight: bold; }
.meta { color: #666; margin-bottom: 2rem; }
.content-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
.ingredients { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; }
@media (max-width: 700px) { .content-grid { grid-template-columns: 1fr; } }
</style>