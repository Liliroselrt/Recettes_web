<template>
  <div>
    <!-- Support (staff): the requests from the members. Contact staff: my requests (admins also see the team's) -->
    <div v-if="view === 'support' || (view === 'contact' && isAdmin)" class="flex flex-wrap items-center gap-2 mb-4">
      <template v-if="view === 'contact'">
        <button type="button" :class="mode === 'mine' ? 'pill pill-active' : 'pill'" @click="setMode('mine')">
          <i class="fa-solid fa-paper-plane mr-1"></i> My requests
        </button>
        <button type="button" :class="mode === 'team' ? 'pill pill-active' : 'pill'" @click="setMode('team')">
          <i class="fa-solid fa-user-shield mr-1"></i> From the team
          <span v-if="unread.team > 0" class="count-badge ml-1">{{ unread.team }}</span>
        </button>
      </template>
      <template v-if="mode !== 'mine'">
        <span v-if="view === 'contact'" class="mx-1 text-slate-300">|</span>
        <button v-for="f in FILTERS" :key="f.value" type="button" :class="filter === f.value ? 'pill pill-active' : 'pill'" @click="setFilter(f.value)">{{ f.label }}</button>
      </template>
    </div>
    <p v-if="view === 'contact' && isModerator" class="text-sm text-slate-500 mb-3">
      <i class="fa-solid fa-circle-info mr-1 text-brand-500"></i>Write here to reach the admins. Requests from the members are in the <b>Support</b> tab.
    </p>

    <div class="grid md:grid-cols-[19rem_1fr] gap-4 h-[calc(100vh-20rem)] min-h-[30rem]">
      <!-- Left: requests -->
      <section class="panel flex-col overflow-hidden" :class="(activeId || creating) ? 'hidden md:flex' : 'flex'" aria-label="Requests">
        <div v-if="mode === 'mine'" class="p-3 border-b border-orange-100">
          <button type="button" class="btn btn-primary btn-sm w-full" @click="startCreate"><i class="fa-solid fa-plus"></i> New request</button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <p v-if="loadingList" class="text-sm text-slate-500 p-4"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</p>
          <p v-else-if="listError" class="alert-error m-3" role="alert">{{ listError }}</p>
          <div v-else-if="!tickets.length" class="p-6 text-center">
            <div class="w-14 h-14 bg-amber-100 text-brand-500 rounded-full flex items-center justify-center mx-auto text-xl mb-3"><i class="fa-solid fa-headset"></i></div>
            <p class="text-sm text-slate-500">{{ mode !== 'mine' ? 'Nothing here. All caught up!' : 'You have not contacted the staff yet.' }}</p>
          </div>
          <ul v-else class="p-1.5">
            <li v-for="t in tickets" :key="t.id">
              <button type="button" class="w-full rounded-xl px-3 py-2.5 text-left transition-colors" :class="t.id === activeId ? 'bg-orange-50' : 'hover:bg-orange-50/60'" :aria-current="t.id === activeId" @click="openTicket(t.id)">
                <span class="flex items-center justify-between gap-2">
                  <span class="font-bold text-slate-900 truncate" :class="t.unread ? '' : 'font-semibold'">{{ t.subject }}</span>
                  <span v-if="t.unread" class="count-badge shrink-0" :aria-label="`${t.unread} new answer`">{{ t.unread }}</span>
                </span>
                <span class="flex flex-wrap items-center gap-1.5 mt-1">
                  <span class="tag !ml-0" :class="t.status === 'open' ? 'tag-warn' : ''">{{ STATUS_LABELS[t.status] }}</span>
                  <span v-if="t.adminOnly" class="tag !ml-0">Admins only</span>
                  <span v-if="mode !== 'mine'" class="text-xs text-slate-500 truncate">{{ t.username }}</span>
                  <span class="text-[11px] text-slate-400 ml-auto">{{ timeAgo(t.updatedAt) }}</span>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </section>

      <!-- Right: new request / one request -->
      <section class="panel flex-col overflow-hidden" :class="(activeId || creating) ? 'flex' : 'hidden md:flex'" aria-label="Request details">
        <!-- Nothing selected -->
        <div v-if="!activeId && !creating" class="m-auto text-center p-8 max-w-sm">
          <div class="w-16 h-16 bg-amber-100 text-brand-500 rounded-full flex items-center justify-center mx-auto text-2xl mb-3"><i class="fa-solid fa-life-ring"></i></div>
          <template v-if="mode !== 'mine'"><p class="text-slate-500 text-sm">Select a request to read it and answer.</p></template>
          <template v-else>
            <p class="font-bold text-slate-900 mb-1">Need help from the team?</p>
            <p class="text-slate-500 text-sm mb-4">Ask a question, report a bug, or appeal a suspension. A moderator or an admin will answer here.</p>
            <button type="button" class="btn btn-primary btn-lg" @click="startCreate"><i class="fa-solid fa-plus"></i> New request</button>
          </template>
        </div>

        <!-- New request -->
        <form v-else-if="creating" class="flex-1 overflow-y-auto p-5 sm:p-6" novalidate @submit.prevent="createTicket">
          <div class="flex items-center gap-3 mb-4">
            <button type="button" class="btn btn-secondary btn-icon md:hidden" aria-label="Back" @click="creating = false"><i class="fa-solid fa-arrow-left"></i></button>
            <h2 class="text-xl font-bold text-slate-900">New request</h2>
          </div>

          <p v-if="isRestricted" class="notice notice-warn"><i class="fa-solid fa-triangle-exclamation"></i> Your account is suspended. Choose “Appeal a suspension” and explain your situation.</p>
          <p v-if="formError" class="alert-error mb-4" role="alert">{{ formError }}</p>

          <div class="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="field-label" for="t-category">What is it about?</label>
              <select id="t-category" v-model="form.category" class="field">
                <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
            <p v-if="isModerator" class="text-sm text-slate-600 self-end pb-2"><i class="fa-solid fa-user-shield text-brand-500 mr-1"></i>Your request goes to the admins.</p>
            <fieldset v-else>
              <legend class="field-label">Who should read it?</legend>
              <label class="flex items-center gap-2 text-sm text-slate-700 py-1 cursor-pointer">
                <input v-model="form.adminOnly" type="radio" :value="false" class="accent-orange-600"> Moderators and admins
              </label>
              <label class="flex items-center gap-2 text-sm text-slate-700 py-1 cursor-pointer">
                <input v-model="form.adminOnly" type="radio" :value="true" class="accent-orange-600"> Admins only
              </label>
            </fieldset>
          </div>

          <div class="mb-4">
            <label class="field-label" for="t-subject">Subject</label>
            <input id="t-subject" v-model="form.subject" type="text" maxlength="120" class="field" placeholder="In a few words">
          </div>
          <div class="mb-5">
            <label class="field-label" for="t-message">Message</label>
            <textarea id="t-message" v-model="form.message" rows="7" maxlength="3000" class="field" placeholder="Tell us what happened. The more details, the faster we can help."></textarea>
            <p class="text-[11px] text-slate-400 text-right mt-1">{{ form.message.length }} / 3000</p>
          </div>
          <button type="submit" class="btn btn-primary btn-lg" :disabled="sending">
            <i :class="sending ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'"></i> Send request
          </button>
        </form>

        <!-- One request -->
        <template v-else>
          <header class="p-3 border-b border-orange-100">
            <div class="flex items-start gap-3">
              <button type="button" class="btn btn-secondary btn-icon md:hidden shrink-0" aria-label="Back to requests" @click="closeTicket"><i class="fa-solid fa-arrow-left"></i></button>
              <div v-if="detail" class="min-w-0 flex-1">
                <h2 class="font-bold text-slate-900 break-words">{{ detail.ticket.subject }}</h2>
                <p class="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <span class="tag !ml-0" :class="detail.ticket.status === 'open' ? 'tag-warn' : ''">{{ STATUS_LABELS[detail.ticket.status] }}</span>
                  <span class="tag !ml-0">{{ CATEGORY_LABELS[detail.ticket.category] }}</span>
                  <span v-if="detail.ticket.adminOnly" class="tag !ml-0">Admins only</span>
                  <template v-if="!detail.isOwner">
                    <span>from</span>
                    <RouterLink :to="`/users/${detail.ticket.userId}`" class="font-bold text-brand-700 hover:underline">{{ detail.ticket.username }}</RouterLink>
                    <span v-if="detail.ticket.isBanned" class="tag !ml-0 tag-warn">Suspended</span>
                  </template>
                  <span v-if="detail.ticket.assignedName">· handled by {{ detail.ticket.assignedName }}</span>
                  <span>· {{ formatDateTime(detail.ticket.createdAt) }}</span>
                </p>
              </div>
              <p v-else-if="!detailError" class="text-sm text-slate-500 flex-1"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</p>
              <span v-else class="flex-1"></span>
            </div>
            <!-- Staff: change the state -->
            <div v-if="detail && !detail.isOwner" class="flex flex-wrap gap-2 mt-3">
              <button v-for="s in STAFF_STATUSES" :key="s.value" type="button" class="btn btn-sm" :class="detail.ticket.status === s.value ? 'btn-primary' : 'btn-secondary'" :disabled="statusBusy || detail.ticket.status === s.value" @click="setStatus(s.value)">
                <i :class="s.icon"></i> {{ s.label }}
              </button>
            </div>
          </header>

          <div ref="scroller" class="flex-1 overflow-y-auto bg-amber-50/40 p-4 space-y-3" aria-live="polite">
            <p v-if="detailError" class="alert-error" role="alert">{{ detailError }}</p>
            <div v-for="m in detail ? detail.messages : []" :key="m.id" class="flex flex-col min-w-0 max-w-[85%]" :class="isMine(m) ? 'items-end ml-auto' : 'items-start'">
              <span class="text-[11px] text-slate-500 mb-0.5 px-1">
                {{ isMine(m) && detail.isOwner ? 'You' : m.author }}
                <span v-if="m.fromStaff" class="tag !ml-1 tag-warn capitalize">{{ m.role === 'admin' ? 'Admin' : 'Staff' }}</span>
              </span>
              <p class="bubble" :class="isMine(m) ? 'bubble-mine' : (m.fromStaff ? 'bubble-staff' : 'bubble-theirs')">{{ m.content }}</p>
              <span class="text-[10px] text-slate-400 mt-0.5 px-1">{{ formatDateTime(m.createdAt) }}</span>
            </div>
          </div>

          <footer v-if="detail" class="border-t border-orange-100 p-3">
            <p v-if="replyError" class="alert-error mb-2" role="alert">{{ replyError }}</p>
            <p v-if="detail.ticket.status === 'closed'" class="notice notice-warn !mb-0"><i class="fa-solid fa-lock"></i> This request is closed.<template v-if="detail.isOwner">&nbsp;Please open a new one if you still need help.</template></p>
            <form v-else class="flex items-end gap-2" @submit.prevent="reply">
              <label class="sr-only" for="reply-draft">Your answer</label>
              <textarea id="reply-draft" v-model="replyDraft" rows="2" maxlength="3000" class="field resize-none" :placeholder="detail.isOwner ? 'Add details or reply...' : 'Answer this person...'" @keydown.enter.exact.prevent="reply"></textarea>
              <button type="submit" class="btn btn-primary btn-lg" :disabled="sending || !replyDraft.trim()" aria-label="Send">
                <i :class="sending ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'"></i>
              </button>
            </form>
          </footer>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { apiFetch } from '../utils/api'
import { timeAgo } from '../utils/recipes'
import { formatDateTime } from '../utils/reports'
import { useRoles } from '../composables/useRoles'
import { useMessages } from '../composables/useMessages'

const POLL_MS = 8000

const STATUS_LABELS = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' }
const CATEGORIES = [
  { value: 'general', label: 'General question' },
  { value: 'bug', label: 'Bug or technical problem' },
  { value: 'billing', label: 'Gourmet Plus / payment' },
  { value: 'ban_appeal', label: 'Appeal a suspension' },
  { value: 'other', label: 'Something else' }
]
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))
const FILTERS = [
  { value: 'active', label: 'To handle' }, { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }
]
const STAFF_STATUSES = [
  { value: 'in_progress', label: 'In progress', icon: 'fa-solid fa-spinner' },
  { value: 'resolved', label: 'Resolved', icon: 'fa-solid fa-check' },
  { value: 'closed', label: 'Close', icon: 'fa-solid fa-lock' }
]

const props = defineProps({
  // 'support' : boîte de réception du staff (demandes des membres) · 'contact' : mes demandes au staff
  view: { type: String, default: 'contact' }
})

const { isModerator, isAdmin, isRestricted } = useRoles()
const { unread, refreshUnread } = useMessages()

// 'inbox' (staff: requests from the members) · 'team' (admins: requests from the team) · 'mine' (my own requests)
const mode = ref(props.view === 'support' ? 'inbox' : 'mine')
const filter = ref('active')

const tickets = ref([])
const loadingList = ref(true)
const listError = ref('')

async function loadTickets() {
  try {
    const paths = {
      inbox: `/messages/staff/tickets?scope=users&status=${filter.value}`,
      team: `/messages/staff/tickets?scope=staff&status=${filter.value}`,
      mine: '/messages/tickets'
    }
    const path = paths[mode.value]
    tickets.value = await apiFetch(path)
    listError.value = ''
  } catch (e) {
    listError.value = e.message
  } finally {
    loadingList.value = false
  }
}

function setMode(value) {
  if (mode.value === value) return
  switchTo(value)
}
function switchTo(value) {
  mode.value = value
  closeTicket()
  creating.value = false
  loadingList.value = true
  loadTickets()
}
function setFilter(value) {
  filter.value = value
  loadingList.value = true
  loadTickets()
}

// ----- One request -----
const activeId = ref(null)
const detail = ref(null)    // { ticket, messages, isOwner }
const detailError = ref('')
const scroller = ref(null)
const statusBusy = ref(false)
let detailSeq = 0

// Whose bubble goes on the right: mine. For the owner, their own messages; for staff, the staff answers.
const isMine = (m) => (detail.value && detail.value.isOwner ? !m.fromStaff : m.fromStaff)

const nearBottom = () => {
  const el = scroller.value
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80
}
const scrollToBottom = () => nextTick(() => { if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight })

async function loadDetail(id, { silent = false } = {}) {
  const seq = ++detailSeq
  try {
    const data = await apiFetch(`/messages/tickets/${id}`)
    if (seq !== detailSeq || activeId.value !== id) return
    const stick = !silent || nearBottom()
    const countBefore = detail.value ? detail.value.messages.length : 0
    detail.value = data
    detailError.value = ''
    if (stick || data.messages.length !== countBefore) scrollToBottom()
    if (!silent) { refreshUnread(); loadTickets() }
  } catch (e) {
    if (seq !== detailSeq) return
    detailError.value = e.message
    if (e.status === 404) detail.value = null
  }
}

function openTicket(id) {
  creating.value = false
  activeId.value = id
  detail.value = null
  detailError.value = ''
  replyError.value = ''
  replyDraft.value = ''
  loadDetail(id)
}
function closeTicket() {
  activeId.value = null
  detail.value = null
  detailSeq++
}

async function setStatus(status) {
  statusBusy.value = true
  replyError.value = ''
  try {
    await apiFetch(`/messages/staff/tickets/${activeId.value}`, { method: 'PATCH', body: { status } })
    await Promise.all([loadDetail(activeId.value, { silent: true }), loadTickets()])
    refreshUnread()
  } catch (e) {
    replyError.value = e.message
  } finally {
    statusBusy.value = false
  }
}

// ----- Reply -----
const replyDraft = ref('')
const replyError = ref('')
const sending = ref(false)

async function reply() {
  const content = replyDraft.value.trim()
  if (!content || sending.value || !activeId.value) return
  sending.value = true
  replyError.value = ''
  try {
    await apiFetch(`/messages/tickets/${activeId.value}/messages`, { method: 'POST', body: { content } })
    replyDraft.value = ''
    await loadDetail(activeId.value, { silent: true })
    scrollToBottom()
    loadTickets()
    refreshUnread()
  } catch (e) {
    replyError.value = e.message
  } finally {
    sending.value = false
  }
}

// ----- New request -----
const creating = ref(false)
const formError = ref('')
const form = reactive({ category: 'general', adminOnly: false, subject: '', message: '' })

function startCreate() {
  closeTicket()
  creating.value = true
  formError.value = ''
  Object.assign(form, { category: isRestricted.value ? 'ban_appeal' : 'general', adminOnly: false, subject: '', message: '' })
}

async function createTicket() {
  formError.value = ''
  if (form.subject.trim().length < 3) return (formError.value = 'Please add a short subject (at least 3 characters).')
  if (form.message.trim().length < 10) return (formError.value = 'Please describe your request (at least 10 characters).')
  sending.value = true
  try {
    const { id } = await apiFetch('/messages/tickets', { method: 'POST', body: { ...form } })
    await loadTickets()
    openTicket(id)
  } catch (e) {
    formError.value = e.message
  } finally {
    sending.value = false
  }
}

// Si le mode « voir comme » retire des droits, on revient sur ce que la personne a encore le droit de voir
watch([isModerator, isAdmin], () => {
  if (mode.value === 'team' && !isAdmin.value) switchTo('mine')
  else { loadingList.value = true; loadTickets() }
}, { immediate: true })

// ----- Regular refresh, paused while the browser tab is hidden -----
let timer = null
onMounted(() => {
  timer = setInterval(() => {
    if (document.hidden) return
    loadTickets()
    if (activeId.value) loadDetail(activeId.value, { silent: true })
  }, POLL_MS)
})
onBeforeUnmount(() => clearInterval(timer))
</script>
