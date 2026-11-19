<template>
  <!-- Rappel permanent quand un admin teste le site avec un autre type de compte -->
  <div v-if="isRealAdmin && viewMode" class="bg-slate-900 text-white text-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
      <span>
        <i class="fa-solid fa-eye text-amber-400 mr-2"></i>
        You are viewing the site as <strong>{{ label }}</strong>. Your real role is admin.
      </span>
      <button type="button" class="btn btn-primary btn-sm" @click="back">Back to admin</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoles, VIEW_MODES } from '../composables/useRoles'

const router = useRouter()
const { isRealAdmin, viewMode, setViewMode } = useRoles()
const label = computed(() => (VIEW_MODES.find(m => m.value === viewMode.value) || {}).label || '')

async function back() {
  await setViewMode('')
}
</script>
