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
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s;
}
.recipe-card:hover {
  transform: translateY(-3px);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.badge {
  background: #ffe3e3;
  color: #ff6b6b;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
}
.fav-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
}
h3 {
  margin: 0.5rem 0;
  color: #2d3436;
}
.meta {
  color: #666;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}
.btn-view {
  display: block;
  text-align: center;
  background: #2d3436;
  color: white;
  padding: 0.6rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: bold;
  font-size: 0.9rem;
}
.btn-view:hover {
  background: #1e272c;
}
</style>