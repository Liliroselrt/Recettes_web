<template>
  <!-- Pantry panel: "What can I cook with what I have?" -->
  <section aria-labelledby="pantry-title" class="panel p-5 sm:p-6 mb-8">
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
      <div>
        <h3 id="pantry-title" class="text-lg font-bold text-slate-900">
          <i class="fa-solid fa-kitchen-set text-brand-500 mr-2"></i>What can I cook with what I have?
        </h3>
        <p class="text-xs text-slate-500 mt-1">Tick the ingredients you have and enter how much. Leave the quantity empty if you have plenty.</p>
      </div>
      <div class="flex items-center gap-4">
        <label class="flex items-center space-x-2 text-sm font-semibold text-slate-700" :class="pantryCount === 0 ? 'opacity-50' : 'cursor-pointer'">
          <input type="checkbox" v-model="onlyCookable" :disabled="pantryCount === 0" class="w-4 h-4 rounded border-slate-300">
          <span>Only recipes I can make</span>
        </label>
        <button v-if="pantryCount > 0" @click="$emit('clear')" class="btn btn-secondary btn-sm">Clear all</button>
      </div>
    </div>

    <!-- Basics: never asked, assumed available -->
    <div class="mb-4 p-3 rounded-2xl bg-brand-50 border border-brand-100">
      <p class="text-xs font-bold uppercase tracking-wider text-brand-800">
        <i class="fa-solid fa-circle-check mr-1"></i>Basics · assumed available
      </p>
      <p class="text-xs text-slate-600 mt-1 mb-2.5">You are never asked about these. Untick one if you do not have it.</p>
      <div class="flex flex-wrap gap-2">
        <button v-for="item in basicItems" :key="item.key" type="button" @click="toggleBasic(item.key)" :aria-pressed="item.assumed" class="chip" :class="item.assumed ? 'chip-on' : ''">
          <i :class="item.assumed ? 'fa-solid fa-check' : 'fa-regular fa-circle'" class="mr-1.5 text-xs"></i>
          <span class="first-letter:uppercase">{{ item.name }}</span>
        </button>
      </div>
    </div>

    <div class="relative mb-3">
      <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-sm"></i>
      <input v-model="pantrySearch" type="text" placeholder="Search an ingredient..." aria-label="Search an ingredient" class="field field-sm pl-10">
    </div>

    <div class="max-h-72 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-1">
      <div v-for="item in filteredCatalog" :key="item.key" class="pantry-item" :class="isInPantry(item.key) ? 'on' : ''">
        <!-- One big label: clicking anywhere on the left part ticks the ingredient -->
        <label class="pantry-label select-none">
          <input type="checkbox" :checked="isInPantry(item.key)" @change="togglePantry(item.key)" class="w-4 h-4 rounded border-slate-300">
          <span class="truncate first-letter:uppercase">{{ item.name }}</span>
        </label>
        <div v-if="isInPantry(item.key) && item.unit" class="pantry-qty">
          <input v-model.number="pantry[item.key].quantity" type="number" min="0" step="any" placeholder="any" :aria-label="'Quantity of ' + item.name" class="field field-sm w-20 text-right">
          <span class="text-xs text-slate-500">{{ item.unit }}</span>
        </div>
      </div>
      <p v-if="filteredCatalog.length === 0" class="text-sm text-slate-500 col-span-full">No ingredient found.</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePantry } from '../composables/usePantry'

defineEmits(['clear'])

const { pantry, onlyCookable, pantryCount, pantryCatalog, basicItems, isInPantry, togglePantry, toggleBasic } = usePantry()

const pantrySearch = ref('')
const filteredCatalog = computed(() => {
  const query = pantrySearch.value.trim().toLowerCase()
  return pantryCatalog.value.filter(item => item.name.includes(query))
})
</script>
