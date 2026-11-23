<template>
  <!-- Picture of a recipe (arrows appear when the recipe has several images).
       The default slot is used for the badges and buttons placed over the picture. -->
  <div class="carousel overflow-hidden" :class="[heightClass, { 'carousel-visible': alwaysShowArrows }]">
    <div
      v-if="showPlaceholder(recipe)"
      class="w-full h-full flex items-center justify-center bg-gradient-to-tr from-brand-500 to-brand-600 text-white/40 text-6xl"
    >
      <i class="fa-solid fa-utensils"></i>
    </div>
    <img
      v-else
      :src="currentImage(recipe)"
      :alt="recipe.title"
      :loading="lazy ? 'lazy' : undefined"
      @error="onImageError(currentImage(recipe))"
      class="w-full h-full object-cover"
    >

    <slot />

    <!-- Previous / next image -->
    <template v-if="recipeImages(recipe).length > 1">
      <button type="button" @click.stop="stepImage(recipe, -1)" class="carousel-btn carousel-prev" aria-label="Previous image">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <button type="button" @click.stop="stepImage(recipe, 1)" class="carousel-btn carousel-next" aria-label="Next image">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <span class="carousel-count" :class="{ 'carousel-count-top': countOnTop }">
        {{ imagePosition(recipe) + 1 }} / {{ recipeImages(recipe).length }}
      </span>
    </template>
  </div>
</template>

<script setup>
import { useImages } from '../composables/useImages'

defineProps({
  recipe: { type: Object, required: true },
  heightClass: { type: String, default: 'h-48' },
  alwaysShowArrows: { type: Boolean, default: false },
  countOnTop: { type: Boolean, default: false },
  lazy: { type: Boolean, default: false }
})

const { recipeImages, imagePosition, currentImage, stepImage, showPlaceholder, onImageError } = useImages()
</script>
