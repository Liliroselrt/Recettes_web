<template>
  <div class="max-w-5xl mx-auto">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900"><i class="fa-solid fa-shield-halved text-brand-500 mr-2"></i>Moderation</h1>
        <p class="text-slate-600 mt-1 text-sm">Read the reports sent by members and decide what happens. The person concerned sees your decision and your message.</p>
      </div>
      <div v-if="isModerator" class="flex gap-2">
        <button type="button" :class="status === 'pending' ? 'pill pill-active' : 'pill'" @click="setStatus('pending')">Pending</button>
        <button type="button" :class="status === 'resolved' ? 'pill pill-active' : 'pill'" @click="setStatus('resolved')">Handled</button>
      </div>
    </header>

    <p v-if="!isModerator" class="alert-error" role="alert">You do not have access to this page.</p>

    <template v-else>
      <p v-if="error" class="alert-error mb-4" role="alert">{{ error }}</p>
      <p v-if="loading" class="text-sm text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Loading...</p>
      <div v-else-if="!reports.length" class="panel p-8 text-center text-slate-600">
        <i class="fa-solid fa-circle-check text-3xl text-emerald-500 mb-3"></i>
        <p class="font-semibold text-slate-800">{{ status === 'pending' ? 'No report waiting' : 'No handled report yet' }}</p>
      </div>

      <div class="space-y-5">
        <article v-for="r in reports" :key="r.id" class="panel p-5 sm:p-6">
          <!-- Header -->
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="tag"><i :class="['fa-solid', TARGET_ICONS[r.targetType], 'mr-1']"></i>{{ TARGET_LABELS[r.targetType] }}</span>
              <span class="tag tag-warn">{{ REASON_LABELS[r.reason] || r.reason }}</span>
              <span class="text-xs text-slate-500">#{{ r.id }} · {{ formatDateTime(r.createdAt) }}</span>
            </div>
            <span v-if="r.status !== 'pending'" class="tag" :class="{ 'tag-warn': statusInfo(r).warn }">{{ statusInfo(r).label }}</span>
          </div>

          <div class="grid md:grid-cols-2 gap-6">
            <!-- What was reported -->
            <div class="space-y-3 text-sm">
              <div>
                <p class="field-label">Reported content</p>
                <template v-if="r.targetType === 'recipe'">
                  <p class="font-bold text-slate-900">{{ r.preview ? r.preview.title : r.targetLabel }}</p>
                  <p v-if="!r.preview" class="text-xs text-rose-600">This recipe no longer exists.</p>
                  <p v-else class="flex gap-1.5 mt-1">
                    <span class="tag">{{ r.preview.shared ? 'Shared' : 'Private' }}</span>
                    <span v-if="r.preview.isHidden" class="tag tag-warn">Hidden</span>
                  </p>
                </template>
                <template v-else-if="r.targetType === 'review'">
                  <template v-if="r.preview">
                    <p class="italic text-slate-700">"{{ r.preview.comment }}"</p>
                    <p class="text-xs text-slate-500 mt-1">{{ r.preview.rating }}/5 on {{ r.preview.recipeTitle }}</p>
                  </template>
                  <p v-else class="text-xs text-rose-600">This review no longer exists. {{ r.targetLabel }}</p>
                </template>
                <p v-else class="font-bold text-slate-900">{{ r.targetLabel }}</p>
              </div>

              <div v-if="r.owner">
                <p class="field-label">Person concerned</p>
                <p class="text-slate-800">
                  <span class="font-bold">{{ r.owner.username }}</span>
                  <span v-if="r.owner.isBanned" class="tag tag-warn ml-1.5">Suspended</span>
                </p>
                <p class="text-xs text-slate-500">{{ r.owner.totalReports }} report{{ r.owner.totalReports === 1 ? '' : 's' }} in total, {{ r.owner.actionsTaken }} with an action</p>
              </div>

              <div>
                <p class="field-label">Reported by</p>
                <p class="text-slate-800">
                  <span class="font-bold">{{ r.reporter.username }}</span>
                  <span v-if="!r.reporter.canReport" class="tag tag-warn ml-1.5">Reporting removed</span>
                </p>
                <p v-if="r.details" class="mt-1 text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 whitespace-pre-line">{{ r.details }}</p>
                <p v-else class="text-xs text-slate-400 mt-1">No description.</p>
              </div>
            </div>

            <!-- Decision -->
            <div>
              <!-- Already handled -->
              <div v-if="r.status !== 'pending'" class="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm space-y-1.5">
                <p class="font-semibold text-slate-900">{{ ACTION_LABELS[r.action] || 'Reviewed' }}</p>
                <p class="text-xs text-slate-500">By {{ r.reviewedBy || 'a moderator' }} on {{ formatDateTime(r.updatedAt) }}</p>
                <p v-if="r.decisionMessage" class="text-slate-700"><span class="font-semibold">Message shown:</span> {{ r.decisionMessage }}</p>
                <p v-if="r.moderatorNote" class="text-slate-600"><span class="font-semibold">Internal note:</span> {{ r.moderatorNote }}</p>
              </div>

              <!-- To decide -->
              <form v-else-if="forms[r.id]" @submit.prevent="submit(r)" novalidate>
                <p class="field-label">Your decision</p>
                <div class="space-y-2 mb-4">
                  <label v-for="key in optionsFor(r)" :key="key" class="decision-choice flex items-start gap-3" :class="{ 'decision-choice-active': forms[r.id].decision === key }">
                    <input type="radio" class="mt-1 accent-brand-600" :name="'decision-' + r.id" :value="key" v-model="forms[r.id].decision">
                    <span>
                      <span class="block text-sm font-bold text-slate-800">{{ DECISION_OPTIONS[key].label }}</span>
                      <span class="block text-xs text-slate-500">{{ DECISION_OPTIONS[key].help }}</span>
                    </span>
                  </label>
                </div>

                <label class="field-label" :for="'msg-' + r.id">
                  Message for the person concerned
                  <span class="font-normal text-slate-400">{{ forms[r.id].decision === 'dismiss' || !forms[r.id].decision ? '(optional)' : '(required, they will read it)' }}</span>
                </label>
                <textarea :id="'msg-' + r.id" v-model="forms[r.id].message" rows="2" maxlength="1000" class="field mb-3" placeholder="Explain the decision in a few words"></textarea>

                <label class="field-label" :for="'note-' + r.id">Internal note <span class="font-normal text-slate-400">(only staff see it)</span></label>
                <textarea :id="'note-' + r.id" v-model="forms[r.id].note" rows="2" maxlength="1000" class="field mb-3"></textarea>

                <label v-if="!r.reporter.isStaff && r.reporter.canReport" class="flex items-start gap-2 text-sm text-slate-700 mb-4 cursor-pointer">
                  <input type="checkbox" class="mt-1 accent-brand-600" v-model="forms[r.id].restrictReporter">
                  <span>This report is abusive: remove <strong>{{ r.reporter.username }}</strong>'s ability to report</span>
                </label>

                <p v-if="forms[r.id].error" class="alert-error mb-3" role="alert">{{ forms[r.id].error }}</p>
                <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="forms[r.id].busy">
                  <i :class="forms[r.id].busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-gavel'"></i> Apply the decision
                </button>
              </form>
            </div>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { apiFetch } from '../utils/api'
import { useRoles } from '../composables/useRoles'
import { REASON_LABELS, TARGET_LABELS, TARGET_ICONS, ACTION_LABELS, statusInfo, formatDateTime } from '../utils/reports'

const { isModerator, isAdmin } = useRoles()

const DECISION_OPTIONS = {
  dismiss: { label: 'Dismiss the report', help: 'Nothing wrong here. No action is taken.' },
  warn: { label: 'Send a warning', help: 'The person is warned, nothing is removed.' },
  hide_recipe: { label: 'Hide the recipe', help: 'Removed from the community. Only its author still sees it and cannot share it again.' },
  delete_recipe: { label: 'Delete the recipe', help: 'Permanent. Its reviews and favourites are deleted too.' },
  delete_review: { label: 'Delete the review', help: 'Permanent.' },
  ban_user: { label: 'Suspend the account', help: 'The person can still log in but can no longer post reviews or share recipes. Admins only.', adminOnly: true }
}
const OPTIONS_BY_TYPE = {
  recipe: ['dismiss', 'warn', 'hide_recipe', 'delete_recipe', 'ban_user'],
  review: ['dismiss', 'warn', 'delete_review', 'ban_user'],
  user: ['dismiss', 'warn', 'ban_user']
}
const optionsFor = (r) => (OPTIONS_BY_TYPE[r.targetType] || ['dismiss']).filter(key => !DECISION_OPTIONS[key].adminOnly || isAdmin.value)

const status = ref('pending')
const reports = ref([])
const forms = reactive({})
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    reports.value = await apiFetch(`/mod/reports?status=${status.value}`)
    for (const r of reports.value) {
      if (!forms[r.id]) forms[r.id] = { decision: '', message: '', note: '', restrictReporter: false, busy: false, error: '' }
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function setStatus(value) {
  status.value = value
  load()
}

async function submit(r) {
  const f = forms[r.id]
  f.error = ''
  if (!f.decision) return (f.error = 'Choose a decision.')
  if (f.decision !== 'dismiss' && f.message.trim().length < 5) return (f.error = 'Write a short message for the person concerned: they will read it.')
  if (['delete_recipe', 'delete_review', 'ban_user'].includes(f.decision) && !window.confirm(`${DECISION_OPTIONS[f.decision].label}? This cannot be undone easily.`)) return
  f.busy = true
  try {
    await apiFetch(`/mod/reports/${r.id}/decision`, {
      method: 'POST',
      body: { decision: f.decision, message: f.message, note: f.note, restrictReporter: f.restrictReporter }
    })
    await load()
  } catch (e) {
    f.error = e.message
  } finally {
    f.busy = false
  }
}

// Charge la file dès que la personne est reconnue comme modératrice (ou admin)
watch(isModerator, (allowed) => { if (allowed) load() }, { immediate: true })
</script>

<style scoped>
.decision-choice {
  cursor: pointer;
  border: 1px solid #b4c8ea;
  border-radius: 0.75rem;
  padding: 0.6rem 0.8rem;
  background: #fff;
  transition: border-color 0.15s, background-color 0.15s;
}
.decision-choice:hover { border-color: #4f78b8; }
.decision-choice-active { border-color: #163767; background: #eef3fb; }
</style>
