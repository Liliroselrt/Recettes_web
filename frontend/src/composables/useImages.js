import { ref } from 'vue'
import { DEFAULT_IMAGE, imgSrc } from '../utils/recipes'

// Position du carrousel de chaque recette, liens d'images cassés (partagés entre la
// carte et la fenêtre de détail d'une même recette)
const imageIndex = ref({})        // { [recipeId]: index of the picture currently displayed }
const brokenImages = ref({})      // { [image link]: true } for links that could not be loaded
const defaultImageFailed = ref(false)

export function useImages() {
  // Pictures that can be displayed; the default picture when there is none
  const recipeImages = (recipe) => {
    const list = (recipe.images || []).map(imgSrc).filter(src => !brokenImages.value[src])
    return list.length ? list : [DEFAULT_IMAGE]
  }
  const imagePosition = (recipe) => {
    const count = recipeImages(recipe).length
    return (((imageIndex.value[recipe.id] || 0) % count) + count) % count
  }
  const currentImage = (recipe) => recipeImages(recipe)[imagePosition(recipe)]

  // delta = -1 (previous) or 1 (next); wraps around at both ends
  const stepImage = (recipe, delta) => {
    const count = recipeImages(recipe).length
    imageIndex.value[recipe.id] = (imagePosition(recipe) + delta + count) % count
  }

  // Plain gradient + icon, only if even the default picture cannot be loaded
  const showPlaceholder = (recipe) =>
    defaultImageFailed.value && currentImage(recipe) === DEFAULT_IMAGE

  const onImageError = (src) => {
    if (src === DEFAULT_IMAGE) defaultImageFailed.value = true
    else brokenImages.value[src] = true   // the next picture (or the default one) is displayed
  }
  const onThumbError = (event) => {
    if (!event.target.src.endsWith(DEFAULT_IMAGE)) event.target.src = DEFAULT_IMAGE
  }

  return { recipeImages, imagePosition, currentImage, stepImage, showPlaceholder, onImageError, onThumbError }
}
