import { ref, computed, watch } from 'vue'
import { useRecipes } from './useRecipes'
import { BASIC_INGREDIENTS, ingredientKey } from '../utils/recipes'

// "What can I cook with what I have?" : le garde-manger est personnel à ce navigateur
// (localStorage), il n'est pas stocké dans la base MySQL.
const STORAGE_KEY = 'gc_pantry'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}
const saved = load()

const pantry = ref(saved.pantry || {})                                   // { [ingredientKey]: { have: true, quantity: number | '' } }
const assumedBasics = ref(saved.assumedBasics || [...BASIC_INGREDIENTS]) // basics the user is assumed to have
const onlyCookable = ref(false)
const addQuantities = ref({})                                            // quantities typed in the recipe window before adding

watch([pantry, assumedBasics], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pantry: pantry.value, assumedBasics: assumedBasics.value }))
  } catch { /* stockage indisponible : on continue sans sauvegarde */ }
}, { deep: true })

export function usePantry() {
  const { recipes } = useRecipes()

  // Number of ingredients ticked in the pantry
  const pantryCount = computed(() => Object.values(pantry.value).filter(entry => entry.have).length)

  // Every distinct ingredient found in the recipes the user can see.
  // The unit of an ingredient is the first unit it was written with.
  const ingredientCatalog = computed(() => {
    const catalog = new Map()
    recipes.value.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        const key = ingredientKey(ing.name)
        const known = catalog.get(key)
        if (!known) catalog.set(key, { key, name: ing.name, unit: ing.unit })
        else if (!known.unit && ing.unit) known.unit = ing.unit
      })
    })
    return [...catalog.values()].sort((a, b) => a.name.localeCompare(b.name))
  })

  const unitByKey = computed(() => {
    const units = {}
    ingredientCatalog.value.forEach(item => { units[item.key] = item.unit })
    return units
  })

  const isAssumedBasic = (key) => assumedBasics.value.includes(key)

  // Ingredients the pantry asks about (basics are left out while assumed available)
  const pantryCatalog = computed(() => ingredientCatalog.value.filter(item => !isAssumedBasic(item.key)))

  const basicItems = computed(() =>
    BASIC_INGREDIENTS.map(name => ({ key: name, name, assumed: isAssumedBasic(name) })))

  // ----- Pantry -----
  const isInPantry = (key) => !!(pantry.value[key] && pantry.value[key].have)
  const togglePantry = (key) => {
    if (isInPantry(key)) pantry.value[key].have = false
    else pantry.value[key] = { have: true, quantity: '' }
  }
  const clearPantry = () => {
    pantry.value = {}
    onlyCookable.value = false
  }

  // 'basic' (assumed available) | 'ok' | 'short' (have it, but not enough) | 'missing'
  const ingredientStatus = (ing) => {
    const key = ingredientKey(ing.name)
    if (isAssumedBasic(key)) return 'basic'

    const entry = pantry.value[key]
    if (!entry || !entry.have) return 'missing'

    const needsQuantity = ing.unit && ing.quantity !== null
    const hasQuantity = entry.quantity !== '' && entry.quantity !== null
    // "To taste" ingredient, or quantity left empty ("I have plenty"): presence is enough
    if (!needsQuantity || !hasQuantity) return 'ok'
    // Different unit than the one shown in the pantry: quantities cannot be compared
    if (unitByKey.value[key] !== ing.unit) return 'ok'
    return entry.quantity >= ing.quantity ? 'ok' : 'short'
  }

  // Basics are not counted: only the ingredients the user must really have
  const pantryMatch = (recipe) => {
    const missing = []
    const short = []
    let total = 0
    recipe.ingredients.forEach(ing => {
      const status = ingredientStatus(ing)
      if (status === 'basic') return
      total++
      if (status === 'missing') missing.push(ing.name)
      else if (status === 'short') short.push(ing.name)
    })
    return {
      missing, short, total,
      matched: total - missing.length - short.length,
      canMake: missing.length === 0 && short.length === 0
    }
  }

  const pantryMatchText = (recipe) => {
    const match = pantryMatch(recipe)
    const parts = []
    if (match.missing.length) {
      const shown = match.missing.slice(0, 3).join(', ')
      const more = match.missing.length > 3 ? ` +${match.missing.length - 3} more` : ''
      parts.push(`Missing: ${shown}${more}`)
    }
    if (match.short.length) parts.push(`Not enough: ${match.short.join(', ')}`)
    return parts.join(' · ')
  }

  // ----- Basics -----
  const toggleBasic = (key) => {
    if (isAssumedBasic(key)) {
      assumedBasics.value = assumedBasics.value.filter(k => k !== key)
    } else {
      assumedBasics.value.push(key)
      delete pantry.value[key]   // back to "assumed": forget any manual entry
    }
  }

  // ----- Ingredient rows of the recipe window -----
  const statusLabel = (ing) => ({
    basic: 'Basic ingredient, assumed available',
    ok: 'In your pantry',
    short: 'Not enough in your pantry',
    missing: 'Not in your pantry'
  }[ingredientStatus(ing)])

  const statusIcon = (ing) => {
    switch (ingredientStatus(ing)) {
      case 'basic':
      case 'ok': return 'fa-solid fa-check'
      case 'short': return 'fa-solid fa-exclamation'
      default: return pantryCount.value > 0 ? 'fa-solid fa-xmark' : 'fa-regular fa-circle'
    }
  }

  const rowClass = (ing) => {
    const status = ingredientStatus(ing)
    // With an empty pantry, missing ingredients stay neutral instead of looking like an error
    return `ing-${status}${status === 'missing' && pantryCount.value === 0 ? ' ing-idle' : ''}`
  }

  // Ingredients of a recipe that are missing or not available in a sufficient quantity
  const recipeMissingCount = (recipe) =>
    recipe.ingredients.filter(ing => ['missing', 'short'].includes(ingredientStatus(ing))).length

  // Quantity proposed in the "Add" field: what is still needed
  const defaultAddQuantity = (ing) => {
    if (!ing.unit || ing.quantity === null) return ''
    const entry = pantry.value[ingredientKey(ing.name)]
    const have = entry && entry.have && entry.quantity !== '' ? entry.quantity : 0
    return Math.round(Math.max(ing.quantity - have, 0) * 100) / 100
  }
  const addQuantity = (ing) => {
    const key = ingredientKey(ing.name)
    return key in addQuantities.value ? addQuantities.value[key] : defaultAddQuantity(ing)
  }
  const setAddQuantity = (ing, value) => {
    addQuantities.value[ingredientKey(ing.name)] = value === '' ? '' : Number(value)
  }

  // Add an ingredient of the recipe to the pantry with the chosen quantity.
  // If it is already there, the quantity is added to what the user already has.
  const addToPantry = (ing) => {
    const key = ingredientKey(ing.name)
    const typed = addQuantity(ing)
    const sameUnit = unitByKey.value[key] === ing.unit
    const amount = (typed === '' || typed === null || !sameUnit) ? '' : Number(typed)

    const entry = pantry.value[key]
    if (entry && entry.have) {
      if (amount !== '' && entry.quantity !== '') {
        entry.quantity = Math.round((entry.quantity + amount) * 100) / 100
      }
    } else {
      pantry.value[key] = { have: true, quantity: amount }
    }
    delete addQuantities.value[key]
  }

  const addAllMissing = (recipe) => {
    recipe.ingredients.forEach(ing => {
      if (['missing', 'short'].includes(ingredientStatus(ing))) {
        delete addQuantities.value[ingredientKey(ing.name)]   // use the proposed quantity
        addToPantry(ing)
      }
    })
  }

  const resetAddQuantities = () => { addQuantities.value = {} }

  return {
    pantry, onlyCookable, pantryCount, ingredientCatalog, unitByKey, pantryCatalog, basicItems,
    isAssumedBasic, isInPantry, togglePantry, clearPantry, toggleBasic,
    ingredientStatus, pantryMatch, pantryMatchText,
    statusLabel, statusIcon, rowClass, recipeMissingCount,
    addQuantity, setAddQuantity, addToPantry, addAllMissing, resetAddQuantities
  }
}
