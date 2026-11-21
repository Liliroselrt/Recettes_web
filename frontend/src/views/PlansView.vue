<template>
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900">Cook along with every video</h1>
      <p class="text-slate-600 mt-2">
        Gourmet Plus unlocks the video of every recipe for {{ PLAN.priceLabel }} a month. Cancel whenever you like.
      </p>
    </div>

    <p v-if="justPaid" class="notice notice-ok mb-6" role="status">
      <i class="fa-solid fa-circle-check"></i>
      <span>Payment done. Every recipe video is now unlocked.</span>
    </p>
    <p v-if="error" class="alert-error mb-6" role="alert">{{ error }}</p>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- Free -->
      <section class="panel p-6 sm:p-8" aria-labelledby="plan-free">
        <h2 id="plan-free" class="text-xl font-bold text-slate-900">Free</h2>
        <p class="text-3xl font-extrabold text-slate-900 mt-2">R0</p>
        <ul class="mt-5 space-y-2.5 text-sm text-slate-700">
          <li v-for="item in freeFeatures" :key="item" class="flex gap-2.5">
            <i class="fa-solid fa-check text-brand-500 mt-0.5"></i><span>{{ item }}</span>
          </li>
        </ul>
      </section>

      <!-- Gourmet Plus -->
      <section class="panel p-6 sm:p-8 !border-2 !border-brand-400" aria-labelledby="plan-plus">
        <h2 id="plan-plus" class="text-xl font-bold text-slate-900">
          <i class="fa-solid fa-star text-brand-500 mr-1.5"></i>{{ PLAN.name }}
        </h2>
        <p class="text-3xl font-extrabold text-slate-900 mt-2">
          {{ PLAN.priceLabel }}<span class="text-base font-semibold text-slate-500"> / month</span>
        </p>
        <ul class="mt-5 space-y-2.5 text-sm text-slate-700">
          <li v-for="item in plusFeatures" :key="item" class="flex gap-2.5">
            <i class="fa-solid fa-check text-brand-500 mt-0.5"></i><span>{{ item }}</span>
          </li>
        </ul>

        <div class="mt-6">
          <!-- Already a member -->
          <template v-if="isSubscriber">
            <p class="notice notice-ok" role="status">
              <i class="fa-solid fa-circle-check"></i>
              <span v-if="hasStaffAccess">Gourmet Plus is included with your {{ role }} account. No subscription needed.</span>
              <span v-else-if="simulated">Simulated subscription (you are viewing the site as a subscriber).</span>
              <span v-else-if="willRenew">You are a member until {{ endLabel }}.</span>
              <span v-else>Cancelled. You keep access until {{ endLabel }}.</span>
            </p>
            <button v-if="willRenew && !simulated && !hasStaffAccess" type="button" class="btn btn-danger btn-sm mt-3" :disabled="busy" @click="stopSubscription">
              <i :class="busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-ban'"></i> Cancel subscription
            </button>
          </template>

          <!-- Not a member yet -->
          <button v-else type="button" class="btn btn-primary btn-lg w-full" @click="subscribe">
            <i class="fa-solid fa-star"></i>
            {{ isLoggedIn ? `Subscribe for ${PLAN.priceLabel} a month` : 'Log in to subscribe' }}
          </button>
        </div>

        <p class="text-xs text-slate-500 mt-4">
          <i class="fa-solid fa-flask mr-1"></i>Demo payment: no real money is charged.
        </p>
      </section>
    </div>

    <FakePaymentModal v-if="showPayment" @close="showPayment = false" @paid="onPaid" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import FakePaymentModal from '../components/FakePaymentModal.vue'
import { useAuth } from '../composables/useAuth'
import { useUI } from '../composables/useUI'
import { useSubscription, PLAN } from '../composables/useSubscription'
import { useRoles } from '../composables/useRoles'

const { isLoggedIn } = useAuth()
const { openAuth } = useUI()
const { isSubscriber, hasStaffAccess, willRenew, simulated, endDate, cancel } = useSubscription()
const { role } = useRoles()

const freeFeatures = [
  'Browse and cook every community recipe',
  'Create, share or keep your own recipes private',
  'Favourites, reviews and your pantry',
  'Watch the video of your own recipes'
]
const plusFeatures = [
  'Everything in Free',
  'Watch the video of every recipe',
  'A Gourmet Plus star on your avatar',
  'Cancel anytime: access lasts until the end of the paid month'
]

const showPayment = ref(false)
const justPaid = ref(false)
const busy = ref(false)
const error = ref('')

const endLabel = computed(() =>
  endDate.value ? new Date(endDate.value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
)

function subscribe() {
  if (!isLoggedIn.value) return openAuth()
  error.value = ''
  showPayment.value = true
}

function onPaid() {
  showPayment.value = false
  justPaid.value = true
}

async function stopSubscription() {
  if (!window.confirm(`Cancel the subscription? You keep access until ${endLabel.value}.`)) return
  busy.value = true
  error.value = ''
  try {
    await cancel()
    justPaid.value = false
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
