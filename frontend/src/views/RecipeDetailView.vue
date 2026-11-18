<template>
  <div class="recipe-detail" v-if="recipe">
    <RouterLink to="/" class="back-link">← Retour aux recettes</RouterLink>
    
    <div class="recipe-card-full">
      <div class="top-header">
        <span class="badge">{{ recipe.category }}</span>
        <button @click="signaler('recette', recipe.id)" class="btn-report-link">
          ⚠️ Signaler cette recette
        </button>
      </div>

      <h1>{{ recipe.title }}</h1>

      <div class="author-bar">
        <span class="meta">
          ⏱️ {{ recipe.prep_time }} min • Par <strong>{{ recipe.author_name }}</strong>
        </span>
        
        <div class="author-actions" v-if="recipe.author_id">
          <button 
            @click="toggleAbonnement(recipe.author_id)" 
            :class="['btn-pill', isSubscribed ? 'subscribed' : '']"
          >
            {{ isSubscribed ? '✓ Abonné' : "+ S'abonner" }}
          </button>
          
          <button 
            @click="bloquerUtilisateur(recipe.author_id)" 
            class="btn-block-subtle"
            title="Bloquer cet utilisateur"
          >
            🚫 Bloquer
          </button>
        </div>
      </div>

      <div class="video-wrapper" v-if="recipe.videoUrl">
        <iframe :src="recipe.videoUrl" frameborder="0" allowfullscreen></iframe>
      </div>

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
import { useRoute, useRouter } from 'vue-router'
import CommentSection from '../components/CommentSection.vue'

const route = useRoute()
const router = useRouter()
const recipe = ref(null)
const isSubscribed = ref(false)

onMounted(async () => {
  try {
    const response = await fetch('http://localhost:3000/api/recipes')
    const data = await response.json()
    const found = data.find(r => r.id === Number(route.params.id))

    if (found) {
      recipe.value = {
        ...found,
        prep_time: found.prepTime,
        author_name: found.User ? found.User.username : 'Chef anonyme',
        author_id: found.User ? found.User.id : found.userId 
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


async function toggleAbonnement(creatorId) {
  isSubscribed.value = !isSubscribed.value
  await fetch('http://localhost:3000/api/abonnement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      creatorId, 
      action: isSubscribed.value ? 'sub' : 'unsub' 
    })
  })
}

async function bloquerUtilisateur(blockedId) {
  if (confirm(`Bloquer ${recipe.value.author_name} ? Vous ne verrez plus ses publications.`)) {
    await fetch('http://localhost:3000/api/bloquer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockedId })
    })
    alert('Utilisateur bloqué.')
    router.push('/') 
  }
}

async function signaler(type, targetId) {
  const motif = prompt('Pourquoi signalez-vous cette recette ?')
  if (!motif) return

  await fetch('http://localhost:3000/api/signalements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, targetId, motif })
  })
  alert('Signalement envoyé aux modérateurs.')
}
</script>

<style scoped>
.back-link { display: inline-block; margin-bottom: 1rem; color: #2e7d32; text-decoration: none; font-weight: bold; }
.recipe-card-full { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }

.top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.badge { background: #ffe3e3; color: #ff6b6b; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }


.btn-report-link { background: none; border: none; color: #999; font-size: 0.8rem; cursor: pointer; padding: 0; }
.btn-report-link:hover { color: #e67e22; text-decoration: underline; }

h1 { margin: 0.5rem 0 1rem; color: #2d3436; }

.author-bar { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 1.5rem; 
  margin-bottom: 1.5rem; 
  border-bottom: 1px solid #f0f0f0; 
}
.meta { color: #666; margin: 0; }
.author-actions { display: flex; align-items: center; gap: 0.6rem; }

.btn-pill {
  background: #2e7d32; 
  color: white;
  border: none;
  padding: 0.45rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-pill:hover { background: #1b5e20; }
.btn-pill.subscribed { background: #e8f5e9; color: #2e7d32; border: 1px solid #2e7d32; }

.btn-block-subtle {
  background: transparent;
  color: #888;
  border: 1px solid #e0e0e0;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-block-subtle:hover { background: #ffebee; color: #c62828; border-color: #ef9a9a; }

.video-wrapper { position: relative; padding-bottom: 56.25%; height: 0; margin-bottom: 2rem; border-radius: 8px; overflow: hidden; }
.video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

.content-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
.ingredients { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; }
@media (max-width: 700px) { .content-grid { grid-template-columns: 1fr; } }
</style>