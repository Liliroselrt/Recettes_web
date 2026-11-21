<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-6">
      <h1 class="text-3xl font-extrabold text-slate-900">Reports about me</h1>
      <p class="text-slate-600 mt-1 text-sm">
        <template v-if="isModerator">Reports other members made about your recipes, reviews or profile, and what the moderators decided.</template>
        <template v-else>Decisions the moderators took after reports about your recipes, reviews or profile. Reports still being reviewed or dismissed are not shown.</template>
        The names of the people who report are never shown.
      </p>
    </div>

    <p v-if="!isLoggedIn" class="notice notice-warn" role="status">
      <i class="fa-solid fa-lock"></i>
      <span>Log in to see the reports about you. <button type="button" class="font-bold underline" @click="openAuth">Log in</button></span>
    </p>

    <template v-else>
      <p v-if="error" class="alert-error mb-4" role="alert">{{ error }}</p>
      <p v-if="loading" class="text-sm text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Loading...</p>

      <template v-else-if="data">
        <p v-if="!data.canReport" class="alert-error mb-4" role="status">
          You can no longer send reports.<span v-if="data.reportBlockedReason"> Reason: {{ data.reportBlockedReason }}</span>
        </p>

        <div v-if="data.reports.length" class="flex flex-wrap gap-2 mb-5">
          <span class="tag">{{ data.reports.length }} report{{ data.reports.length > 1 ? 's' : '' }}</span>
          <span v-if="pendingCount > 0" class="tag tag-warn">{{ pendingCount }} under review</span>
          <span class="tag">{{ warningCount }} with a decision</span>
        </div>

        <div v-if="!data.reports.length" class="panel p-8 text-center text-slate-600">
          <i class="fa-regular fa-face-smile text-3xl text-brand-500 mb-3"></i>
          <p class="font-semibold text-slate-800">Nothing to show</p>
          <p class="text-sm mt-1">No decision has been taken about you.</p>
        </div>

        <div class="space-y-4">
          <article v-for="r in data.reports" :key="r.id" class="panel p-5">
            <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div class="min-w-0">
                <p class="text-xs font-semibold text-slate-500">
                  <i :class="['fa-solid', TARGET_ICONS[r.targetType], 'mr-1']"></i>{{ TARGET_LABELS[r.targetType] }}
                </p>
                <p class="font-bold text-slate-900 break-words">{{ r.targetLabel || 'Deleted content' }}</p>
              </div>
              <span class="tag" :class="{ 'tag-warn': statusInfo(r).warn }">{{ statusInfo(r).label }}</span>
            </div>

            <p class="text-sm text-slate-600">
              Reported for: <span class="font-semibold">{{ REASON_LABELS[r.reason] || r.reason }}</span>
              · {{ formatDate(r.createdAt) }}
            </p>

            <div v-if="r.status !== 'pending'" class="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm">
              <p class="font-semibold text-slate-800">
                Decision: {{ ACTION_LABELS[r.action] || 'Reviewed' }}
                <span class="font-normal text-slate-500">on {{ formatDate(r.updatedAt) }}</span>
              </p>
              <p v-if="r.decisionMessage" class="text-slate-700 mt-1">{{ r.decisionMessage }}</p>
            </div>
            <p v-else class="text-xs text-slate-500 mt-3">A moderator will look at it soon.</p>
          </article>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { apiFetch } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { useUI } from '../composables/useUI'
import { useRoles } from '../composables/useRoles'
import { REASON_LABELS, TARGET_LABELS, TARGET_ICONS, ACTION_LABELS, statusInfo, formatDate } from '../utils/reports'

const { isLoggedIn, token } = useAuth()
const { openAuth } = useUI()
const { isModerator } = useRoles()

const data = ref(null)
const loading = ref(false)
const error = ref('')

const pendingCount = computed(() => (data.value ? data.value.reports.filter(r => r.status === 'pending').length : 0))
const warningCount = computed(() => (data.value ? data.value.reports.filter(r => r.status === 'action_taken').length : 0))

async function load() {
  if (!token.value) { data.value = null; return }
  loading.value = true
  error.value = ''
  try {
    const result = await apiFetch('/reports/about-me')
    // Users and subscribers only see the reports that led to a decision (never "under review" or dismissed ones)
    if (!isModerator.value) result.reports = result.reports.filter(r => r.status === 'action_taken')
    data.value = result
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
watch(token, load, { immediate: true })
</script>
