<template>
  <form @submit.prevent="handleSubmit" class="recipe-form">
    <h3>{{ initialData ? 'Modifier la recette' : 'Publier une nouvelle recette' }}</h3>
    
    <label>Titre de la recette</label>
    <input v-model="form.title" type="text" required placeholder="Ex: Tarte aux pommes maison" />

    <div class="row">
      <div>
        <label>Catégorie</label>
        <select v-model="form.category" required>
          <option value="Entrée">Entrée</option>
          <option value="Plat">Plat</option>
          <option value="Dessert">Dessert</option>
        </select>
      </div>
      <div>
        <label>Temps de préparation (min)</label>
        <input v-model.number="form.prep_time" type="number" required min="1" />
      </div>
    </div>

    <label>Ingrédients (un par ligne)</label>
    <textarea v-model="form.ingredients" rows="4" required placeholder="200g de farine&#10;3 pommes..."></textarea>

    <label>Instructions</label>
    <textarea v-model="form.instructions" rows="5" required placeholder="Étape 1 : Préchauffez le four..."></textarea>

    <button type="submit" class="btn-submit">
      {{ initialData ? 'Enregistrer les modifications' : 'Publier la recette' }}
    </button>
  </form>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  initialData: { type: Object, default: null }
})
const emit = defineEmits(['submit-recipe'])

const form = reactive({
  title: '',
  category: 'Plat',
  prep_time: 30,
  ingredients: '',
  instructions: ''
})

watch(() => props.initialData, (newVal) => {
  if (newVal) {
    Object.assign(form, newVal)
  }
}, { immediate: true })

const handleSubmit = () => {
  emit('submit-recipe', { ...form })
}
</script>

<style scoped>
.recipe-form {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.row {
  display: flex;
  gap: 1rem;
}
.row > div { flex: 1; }
input, select, textarea {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-sizing: border-box;
}
.btn-submit {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
}
</style>