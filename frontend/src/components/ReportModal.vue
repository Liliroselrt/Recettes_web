<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" @mousedown.self="close">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-10 shadow-2xl relative my-auto" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <button type="button" @click="close" class="modal-close absolute top-4 right-4 !bg-brand-100" aria-label="Close">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>

        <!-- Sent -->
        <div v-if="sent" class="text-center py-6">
          <div class="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-4">
            <i class="fa-solid fa-check"></i>
          </div>
          <h3 id="report-title" class="text-xl font-bold text-slate-900 mb-2">Report sent</h3>
          <p class="text-sm text-slate-600 mb-6">Thank you for helping keep the community friendly. Our moderators will review it.</p>
          <button type="button" class="btn btn-primary btn-lg w-full sm:w-auto sm:px-10" @click="$emit('close')">Close</button>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="send" novalidate>
          <h3 id="report-title" class="text-2xl font-bold text-slate-900 mb-1"><i class="fa-solid fa-flag text-rose-500 mr-2"></i>Report a problem</h3>
          <p class="text-sm text-slate-500 mb-4">Tell us what is wrong. Your report is sent to our moderators.</p>

          <p class="text-sm text-slate-700 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2.5 mb-5">
            <span class="font-semibold">{{ target.kind }}:</span> {{ target.label }}
          </p>

          <p v-if="errorMessage" class="alert-error mb-4" role="alert">{{ errorMessage }}</p>

          <!-- Nature of the problem -->
          <fieldset class="mb-5">
            <legend class="field-label">Nature of the problem</legend>
            <div class="grid sm:grid-cols-2 gap-2.5">
              <label
                v-for="r in REASONS" :key="r.value"
                class="report-choice flex items-start gap-3"
                :class="[{ 'report-choice-active': reason === r.value }, r.value === 'other' ? 'sm:col-span-2' : '']"
              >
                <input type="radio" class="mt-1 accent-brand-600" name="report-reason" :value="r.value" v-model="reason">
                <span>
                  <span class="block text-sm font-bold text-slate-800">{{ r.label }}</span>
                  <span class="block text-xs text-slate-500">{{ r.hint }}</span>
                </span>
              </label>
            </div>
          </fieldset>

          <div class="mb-6">
            <label class="field-label" for="report-details">
              Tell us more <span class="font-normal text-slate-400">{{ reason === 'other' ? '(required)' : '(optional)' }}</span>
            </label>
            <textarea id="report-details" v-model="details" rows="4" :maxlength="MAX_DETAILS" class="field" placeholder="What happened? Where did you see it?"></textarea>
            <p class="text-xs text-slate-400 text-right mt-1">{{ details.length }}/{{ MAX_DETAILS }}</p>
          </div>

          <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="sending">
            <i :class="sending ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'"></i>
            {{ sending ? 'Sending...' : 'Send the report' }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { apiFetch } from '../utils/api'

// target: { type: 'recipe' | 'review', id, kind: 'This recipe', label: 'Pancakes' }
const props = defineProps({ target: { type: Object, required: true } })
const emit = defineEmits(['close'])

const MAX_DETAILS = 1000
const REASONS = [
  { value: 'spam', label: 'Spam or advertising', hint: 'Unwanted promotion, links or repeated posts' },
  { value: 'harassment', label: 'Harassment or hate', hint: 'Insults, threats or discrimination' },
  { value: 'inappropriate_content', label: 'Inappropriate content', hint: 'Offensive, misleading or unsafe content' },
  { value: 'copyright', label: 'Copyright', hint: 'Copied recipe, photos or video' },
  { value: 'other', label: 'Something else', hint: 'Please explain below' }
]

const reason = ref('')
const details = ref('')
const errorMessage = ref('')
const sending = ref(false)
const sent = ref(false)

const close = () => { if (!sending.value) emit('close') }

async function send() {
  errorMessage.value = ''
  if (!reason.value) return (errorMessage.value = 'Please choose the nature of the problem.')
  if (reason.value === 'other' && details.value.trim().length < 10) {
    return (errorMessage.value = 'Please describe the problem (at least 10 characters).')
  }
  sending.value = true
  try {
    await apiFetch('/reports', {
      method: 'POST',
      body: { targetType: props.target.type, targetId: props.target.id, reason: reason.value, details: details.value.trim() }
    })
    sent.value = true
  } catch (e) {
    errorMessage.value = e.message
  } finally {
    sending.value = false
  }
}

const onKeydown = (event) => { if (event.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.report-choice {
  display: block;
  cursor: pointer;
  border: 1px solid #b4c8ea;
  border-radius: 0.75rem;
  padding: 0.7rem 0.9rem;
  background: #fff;
  transition: border-color 0.15s, background-color 0.15s;
}
.report-choice:hover { border-color: #4f78b8; }
.report-choice-active { border-color: #163767; background: #eef3fb; }
</style>
