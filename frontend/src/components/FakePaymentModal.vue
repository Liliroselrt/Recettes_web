<template>
  <!-- Fenêtre de paiement FACTICE (projet local) : aucune donnée de carte n'est envoyée ni enregistrée -->
  <div class="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" @mousedown.self="close">
    <div class="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative" role="dialog" aria-modal="true" aria-labelledby="pay-title">
      <button type="button" @click="close" class="modal-close absolute top-4 right-4 !bg-amber-100" aria-label="Close">
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>
      <h3 id="pay-title" class="text-2xl font-bold text-slate-900 mb-1">Subscribe to {{ PLAN.name }}</h3>
      <p class="text-slate-500 text-sm mb-5">{{ PLAN.priceLabel }} per month</p>

      <p class="notice notice-warn mb-5">
        <i class="fa-solid fa-flask"></i>
        <span>Demo payment: no real money is charged. Enter any card details. A card number ending in 0000 is declined.</span>
      </p>

      <form @submit.prevent="pay" class="space-y-4" novalidate>
        <p v-if="errorMessage" class="alert-error" role="alert">{{ errorMessage }}</p>

        <div>
          <label class="field-label" for="pay-name">Name on the card</label>
          <input id="pay-name" v-model="cardName" type="text" autocomplete="cc-name" placeholder="Chef Marie" class="field">
        </div>
        <div>
          <label class="field-label" for="pay-number">Card number</label>
          <input id="pay-number" :value="cardNumber" @input="onNumber" type="text" inputmode="numeric" maxlength="19" autocomplete="cc-number" placeholder="4242 4242 4242 4242" class="field">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="field-label" for="pay-expiry">Expiry (MM/YY)</label>
            <input id="pay-expiry" :value="expiry" @input="onExpiry" type="text" inputmode="numeric" autocomplete="cc-exp" placeholder="12/28" class="field">
          </div>
          <div>
            <label class="field-label" for="pay-cvc">CVC</label>
            <input id="pay-cvc" :value="cvc" @input="onCvc" type="text" inputmode="numeric" autocomplete="cc-csc" placeholder="123" class="field">
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="paying">
          <i :class="paying ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-lock'"></i>
          {{ paying ? 'Processing...' : `Pay ${PLAN.priceLabel}` }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSubscription, PLAN } from '../composables/useSubscription'

const emit = defineEmits(['close', 'paid'])
const { subscribe } = useSubscription()

const cardName = ref('')
const cardNumber = ref('')
const expiry = ref('')
const cvc = ref('')
const errorMessage = ref('')
const paying = ref(false)

const digits = (value) => String(value).replace(/\D/g, '')
const onNumber = (e) => { cardNumber.value = digits(e.target.value).slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); e.target.value = cardNumber.value }
const onExpiry = (e) => {
  const d = digits(e.target.value).slice(0, 4)
  expiry.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  e.target.value = expiry.value
}
const onCvc = (e) => { cvc.value = digits(e.target.value).slice(0, 4); e.target.value = cvc.value }

const close = () => { if (!paying.value) emit('close') }

function validate() {
  const number = digits(cardNumber.value)
  if (!cardName.value.trim()) return 'Enter the name on the card.'
  if (number.length < 13 || number.length > 16) return 'Enter a valid card number (13 to 16 digits).'
  const [mm, yy] = expiry.value.split('/').map(Number)
  if (!mm || mm < 1 || mm > 12 || !Number.isInteger(yy)) return 'Enter the expiry date as MM/YY.'
  const now = new Date()
  if (2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1)) return 'This card has expired.'
  if (cvc.value.length < 3) return 'Enter the 3 or 4 digit CVC.'
  return ''
}

async function pay() {
  errorMessage.value = validate()
  if (errorMessage.value) return
  paying.value = true
  await new Promise(resolve => setTimeout(resolve, 1200)) // fake processing time
  if (digits(cardNumber.value).endsWith('0000')) {
    errorMessage.value = 'Card declined (demo). Try another card number.'
    paying.value = false
    return
  }
  try {
    await subscribe()
    emit('paid')
  } catch (e) {
    errorMessage.value = e.message
    paying.value = false
  }
}

const onKeydown = (event) => { if (event.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
