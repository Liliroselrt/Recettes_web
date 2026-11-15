<template>
  <div class="recipe-card">
    <div class="card-header">
      <span class="badge">{{ recipe.category }}</span>
      <button @click="$emit('toggle-favorite', recipe.id)" class="fav-btn">
        {{ recipe.isFavorite ? '❤️' : '🤍' }}
      </button>
    </div>
    <h3>{{ recipe.title }}</h3>
    <p class="meta">⏱️ {{ recipe.prep_time }} min • Par <strong>{{ recipe.author_name }}</strong></p>
    <RouterLink :to="`/recipe/${recipe.id}`" class="btn-view">Voir la recette</RouterLink>
  </div>
</template>

<script setup>
defineProps({
  recipe: {
    type: Object,
    required: true
  }
})
defineEmits(['toggle-favorite'])
</script>

<style scoped>
.recipe-card {
  background: white;
  border-radius: 8px;
  padding: 1.2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.badge {
  background: #ffe3e3;
  color: #ff6b6b;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}
.fav-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}
.meta {
  color: #666;
  font-size: 0.9rem;
}
.btn-view {
  display: inline-block;
  margin-top: 1rem;
  text-align: center;
  background: #333;
  color: white;
  padding: 0.5rem;
  border-radius: 5px;
  text-decoration: none;
}
</style>