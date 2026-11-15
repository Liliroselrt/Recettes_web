<template>
  <div class="comments-box">
    <h4>Avis de la communauté ({{ comments.length }})</h4>
    
    <form @submit.prevent="addComment" class="comment-form">
      <select v-model.number="rating">
        <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
        <option value="4">⭐⭐⭐⭐ (4/5)</option>
        <option value="3">⭐⭐⭐ (3/5)</option>
        <option value="2">⭐⭐ (2/5)</option>
        <option value="1">⭐ (1/5)</option>
      </select>
      <input v-model="newComment" type="text" placeholder="Votre avis sur cette recette..." required />
      <button type="submit">Envoyer</button>
    </form>

    <ul class="comment-list">
      <li v-for="c in comments" :key="c.id">
        <strong>{{ c.author }}</strong> ({{ c.rating }}/5) : {{ c.text }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ recipeId: [String, Number] })

const rating = ref(5)
const newComment = ref('')
const comments = ref([
  { id: 1, author: 'ChefLucas', rating: 5, text: 'Super facile et délicieux !' }
])

const addComment = () => {
  comments.value.push({
    id: Date.now(),
    author: 'Moi',
    rating: rating.value,
    text: newComment.value
  })
  newComment.value = ''
}
</script>

<style scoped>
.comments-box { margin-top: 2rem; background: white; padding: 1.5rem; border-radius: 8px; }
.comment-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.comment-form input { flex: 1; padding: 0.5rem; }
.comment-list { list-style: none; padding: 0; }
.comment-list li { padding: 0.5rem 0; border-bottom: 1px solid #eee; }
</style>