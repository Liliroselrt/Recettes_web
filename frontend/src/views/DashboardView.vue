<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>My recipe book</h1>
      <button @click="openCreateForm" class="btn-new">
        {{ showForm ? 'Close the form' : '+ New Recipe' }}
      </button>
    </div>

    <div v-if="showForm" class="form-container">
      <RecipeForm 
        :initialData="editingRecipe" 
        @submit-recipe="handleSaveRecipe" 
      />
    </div>

    <h2>My published recipe ({{ myRecipes.length }})</h2>
    <div v-if="myRecipes.length === 0" class="empty">
      You haven't published any recipe yet.
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import RecipeForm from '../components/RecipeForm.vue'

const router = useRouter()
const showForm = ref(false)
const editingRecipe = ref(null)
const myRecipes = ref([])

const currentUserId = Number(localStorage.getItem('userId'))
const token = localStorage.getItem('token')

const fetchMyRecipes = async () => {
  if (!token) {
    router.push('/login')
    return
  }
  try {
    const response = await fetch('http://localhost:3000/api/recipes')
    const data = await response.json()
    
    // Filtre pour ne garder que les recettes de l'utilisateur connecté
    myRecipes.value = data
      .filter(r => r.userId === currentUserId)
      .map(r => ({ ...r, prep_time: r.prepTime }))
  } catch (error) {
    console.error('Erreur chargement dashboard :', error)
  }
}

onMounted(fetchMyRecipes)

const openCreateForm = () => {
  editingRecipe.value = null
  showForm.value = !showForm.value
}

const openEditForm = (recipe) => {
  editingRecipe.value = { ...recipe }
  showForm.value = true
}

const handleSaveRecipe = async (recipeData) => {
  const payload = {
    title: recipeData.title,
    category: recipeData.category,
    prepTime: Number(recipeData.prep_time || recipeData.prepTime),
    ingredients: recipeData.ingredients,
    instructions: recipeData.instructions
  }

  try {
    if (editingRecipe.value) {
      // Mode UPDATE (PUT /api/recipes/:id)
      const response = await fetch(`http://localhost:3000/api/recipes/${editingRecipe.value.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const err = await response.json()
        return alert(err.error || 'Erreur lors de la modification')
      }
    } else {
      // Mode CREATE (POST /api/recipes)
      const response = await fetch('http://localhost:3000/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const err = await response.json()
        return alert(err.error || 'Erreur lors de la création')
      }
    }

    await fetchMyRecipes()
    showForm.value = false
    editingRecipe.value = null
  } catch (error) {
    alert('Impossible de contacter le serveur.')
  }
}

const deleteRecipe = async (id) => {
  if (!confirm('Voulez-vous vraiment supprimer cette recette ?')) return

  try {
    const response = await fetch(`http://localhost:3000/api/recipes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      const err = await response.json()
      return alert(err.error || 'Erreur lors de la suppression')
    }

    myRecipes.value = myRecipes.value.filter(r => r.id !== id)
  } catch (error) {
    alert('Impossible de contacter le serveur.')
  }
}
</script>

<style scoped>
.dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.btn-new { background: #ff6b6b; color: white; border: none; padding: 0.7rem 1.2rem; border-radius: 5px; font-weight: bold; cursor: pointer; }
.form-container { margin-bottom: 2rem; }
.my-recipe-item { background: white; padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.actions { display: flex; gap: 0.5rem; }
.btn-edit { background: #4dabf7; color: white; border: none; padding: 0.5rem 0.8rem; border-radius: 4px; cursor: pointer; }
.btn-delete { background: #fa5252; color: white; border: none; padding: 0.5rem 0.8rem; border-radius: 4px; cursor: pointer; }
</style>