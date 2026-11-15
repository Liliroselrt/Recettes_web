<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Mon Livre de Recettes</h1>
      <button @click="openCreateForm" class="btn-new">
        {{ showForm ? 'Fermer le formulaire' : '+ Nouvelle Recette' }}
      </button>
    </div>

    <div v-if="showForm" class="form-container">
      <RecipeForm 
        :initialData="editingRecipe" 
        @submit-recipe="handleSaveRecipe" 
      />
    </div>

    <h2>Mes recettes publiées ({{ myRecipes.length }})</h2>
    <div v-if="myRecipes.length === 0" class="empty">
      Vous n'avez pas encore publié de recette.
    </div>

    <div class="my-recipes-list">
      <div v-for="recipe in myRecipes" :key="recipe.id" class="my-recipe-item">
        <div>
          <h3>{{ recipe.title }}</h3>
          <span>{{ recipe.category }} • {{ recipe.prep_time }} min</span>
        </div>
        <div class="actions">
          <button @click="openEditForm(recipe)" class="btn-edit">Modifier</button>
          <button @click="deleteRecipe(recipe.id)" class="btn-delete">Supprimer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RecipeForm from '../components/RecipeForm.vue'

const showForm = ref(false)
const editingRecipe = ref(null)

// Recettes appartenant à l'utilisateur connecté
const myRecipes = ref([
  { 
    id: 1, 
    title: 'Pâtes Carbonara Traditionnelles', 
    category: 'Plat', 
    prep_time: 20,
    ingredients: '400g de spaghettis\n150g de guanciale\n4 jaunes d\'oeufs\n100g de pecorino',
    instructions: 'Cuire les pâtes. Faire dorer le guanciale. Mélanger hors du feu avec les oeufs et le fromage.'
  }
])

const openCreateForm = () => {
  editingRecipe.value = null
  showForm.value = !showForm.value
}

const openEditForm = (recipe) => {
  editingRecipe.value = { ...recipe }
  showForm.value = true
}

const handleSaveRecipe = (recipeData) => {
  if (editingRecipe.value) {
    // Mode UPDATE (PUT /api/recipes/:id)
    const index = myRecipes.value.findIndex(r => r.id === editingRecipe.value.id)
    if (index !== -1) myRecipes.value[index] = { ...recipeData, id: editingRecipe.value.id }
  } else {
    // Mode CREATE (POST /api/recipes)
    myRecipes.value.push({ ...recipeData, id: Date.now() })
  }
  showForm.value = false
  editingRecipe.value = null
}

const deleteRecipe = (id) => {
  if (confirm('Voulez-vous vraiment supprimer cette recette ?')) {
    // Mode DELETE (DELETE /api/recipes/:id)
    myRecipes.value = myRecipes.value.filter(r => r.id !== id)
  }
}
</script>

<style scoped>
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.btn-new {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 0.7rem 1.2rem;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
}
.form-container { margin-bottom: 2rem; }
.my-recipe-item {
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.actions { display: flex; gap: 0.5rem; }
.btn-edit { background: #4dabf7; color: white; border: none; padding: 0.5rem 0.8rem; border-radius: 4px; cursor: pointer; }
.btn-delete { background: #fa5252; color: white; border: none; padding: 0.5rem 0.8rem; border-radius: 4px; cursor: pointer; }
</style>