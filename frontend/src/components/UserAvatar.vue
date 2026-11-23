<template>
  <!-- Photo de profil, ou initiale du pseudo si la personne n'en a pas (ou si l'image ne se charge pas) -->
  <span class="inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-brand-200 font-bold text-brand-800 select-none" :class="SIZES[size] || SIZES.md" aria-hidden="true">
    <img v-if="url && !failed" :src="url" alt="" class="w-full h-full object-cover" @error="failed = true">
    <template v-else>{{ initial }}</template>
  </span>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { imgSrc } from '../utils/recipes'

const props = defineProps({
  name: { type: String, default: '' },
  src: { type: String, default: null },
  size: { type: String, default: 'md' }   // xs | sm | md | lg | xl
})

const SIZES = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-28 h-28 text-5xl'
}

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })

const url = computed(() => imgSrc(props.src))
const initial = computed(() => (props.name || '?').charAt(0).toUpperCase())
</script>
