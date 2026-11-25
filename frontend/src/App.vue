<template>
  <div class="bg-brand-50/40 font-sans text-slate-800 min-h-screen flex flex-col">
    <Navbar />
    <ViewAsBanner />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
      <RouterView />
    </main>

    <footer class="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
        <p>© 2026 Ef'recipe - Vue.js / Express &amp; MySQL Web Project (EFREI Panthéon Assas Université Paris / CPUT)</p>
      </div>
    </footer>

    <RecipeFormModal v-if="showFormModal" />
    <AuthModal v-if="showAuthModal" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import Navbar from './components/Navbar.vue'
import ViewAsBanner from './components/ViewAsBanner.vue'
import AuthModal from './components/AuthModal.vue'
import RecipeFormModal from './components/RecipeFormModal.vue'
import { useUI } from './composables/useUI'
import { useRecipes } from './composables/useRecipes'

const { showFormModal, showAuthModal } = useUI()
const { fetchRecipes } = useRecipes()

onMounted(fetchRecipes)
</script>
