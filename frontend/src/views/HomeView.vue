<template>
  <div class="home">
    <div class="filters">
      <h1>Toutes les recettes de la communauté</h1>
      <div class="filter-controls">
        <select v-model="selectedCategory">
          <option value="">Toutes les catégories</option>
          <option value="Entrée">Entrées</option>
          <option value="Plat">Plats</option>
          <option value="Dessert">Desserts</option>
        </select>
        <label class="fav-filter">
          <input type="checkbox" v-model="onlyFavorites" />
          Mes favoris uniquement ❤️
        </label>
      </div>
    </div>

    <div v-if="recipes.length === 0" class="empty">
      Aucune recette publiée pour le moment. Soyez le premier !
    </div>

    <div class="recipe-grid">
      <RecipeCard 
        v-for="recipe in filteredRecipes" 
        :key="recipe.id" 
        :recipe="recipe"
        @toggle-favorite="toggleFavorite"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import RecipeCard from '../components/RecipeCard.vue'

const selectedCategory = ref('')
const onlyFavorites = ref(false)
const recipes = ref([])

const fetchRecipes = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/recipes')
    const data = await response.json()
    
    // Adaptation des noms de champs Sequelize vers ceux attendus par RecipeCard
    recipes.value = data.map(r => ({
      ...r,
      prep_time: r.prepTime,
      author_name: r.User ? r.User.username : 'Chef anonyme',
      isFavorite: false
    }))
  } catch (error) {
    console.error('Erreur lors du chargement des recettes :', error)
  }
}

onMounted(fetchRecipes)

const filteredRecipes = computed(() => {
  return recipes.value.filter(r => {
    const matchCat = !selectedCategory.value || r.category === selectedCategory.value
    const matchFav = !onlyFavorites.value || r.isFavorite
    return matchCat && matchFav
  })
})

const toggleFavorite = (id) => {
  const recipe = recipes.value.find(r => r.id === id)
  if (recipe) recipe.isFavorite = !recipe.isFavorite
}
</script>

<style scoped>
.filters { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 2rem; }
.filter-controls { display: flex; gap: 1rem; align-items: center; }
select { padding: 0.5rem; border-radius: 5px; border: 1px solid #ccc; }
.recipe-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
.empty { text-align: center; color: #666; margin-top: 2rem; }
</style>