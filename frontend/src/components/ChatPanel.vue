<template>
  <div class="grid md:grid-cols-[20rem_1fr] gap-4 h-[calc(100vh-18rem)] min-h-[36rem]">
    <!-- ================= Left: people, conversations ================= -->
    <section class="panel overflow-y-auto" :class="rightOpen ? 'hidden md:block' : 'block'" aria-label="People and conversations">
      <div class="p-3 border-b border-orange-100">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-sm"></i>
          <input v-model="people.query.value" type="search" maxlength="50" class="field field-sm pl-9" placeholder="Search a user..." aria-label="Search for a user to message">
        </div>
      </div>

      <!-- People: the cooks I follow come first. 5 rows are visible, scroll for the next ones -->
      <div class="px-3 pt-3 pb-2">
        <p class="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">{{ people.query.value.trim() ? 'Results' : 'People' }}</p>
        <p v-if="people.loading.value && !people.list.value.length" class="text-sm text-slate-500 py-2"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</p>
        <p v-else-if="people.error.value" class="text-sm text-rose-600 py-2" role="alert">{{ people.error.value }}</p>
        <p v-else-if="!people.list.value.length" class="text-sm text-slate-500 py-2">{{ people.query.value.trim() ? `No user found for “${people.query.value.trim()}”.` : 'Nobody to show yet. Follow users from the Community page.' }}</p>
        <ul v-else class="people-scroll-compact" aria-label="People">
          <li v-for="p in people.list.value" :key="p.id">
            <button type="button" class="w-full h-full flex items-center gap-3 rounded-xl px-2 text-left hover:bg-orange-50" @click="openFromPeople(p.id)">
              <UserAvatar :name="p.username" :src="p.avatarUrl" size="sm" />
              <span class="min-w-0 flex-1 font-bold text-slate-900 truncate">{{ p.username }}</span>
              <span v-if="isFollowed(p)" class="tag !ml-0 tag-warn shrink-0">Following</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- Conversations -->
      <div class="px-3 pt-2 pb-3 border-t border-orange-100">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Conversations</p>
          <button v-if="!isRestricted" type="button" class="btn btn-secondary btn-sm" @click="startGroup"><i class="fa-solid fa-users"></i> New group</button>
        </div>

        <p v-if="loadingThreads" class="text-sm text-slate-500 py-3"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</p>
        <p v-else-if="listError" class="alert-error" role="alert">{{ listError }}</p>
        <p v-else-if="!threads.length" class="text-sm text-slate-500 py-3">No conversation yet. Pick a user above, or create a group.</p>
        <ul v-else>
          <li v-for="t in threads" :key="threadKey(t)">
            <button type="button" class="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors" :class="isActive(t) ? 'bg-orange-50' : 'hover:bg-orange-50/60'" :aria-current="isActive(t)" @click="openThread(t)">
              <UserAvatar v-if="t.kind === 'direct'" :name="t.username" :src="t.avatarUrl" size="md" />
              <span v-else class="w-10 h-10 flex-none rounded-full bg-amber-200 text-brand-700 flex items-center justify-center" aria-hidden="true"><i class="fa-solid fa-users"></i></span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center justify-between gap-2">
                  <span class="font-bold text-slate-900 truncate">{{ t.kind === 'group' ? t.name : t.username }}</span>
                  <span class="text-[11px] text-slate-400 shrink-0">{{ shortTime(t.lastAt) }}</span>
                </span>
                <span class="flex items-center justify-between gap-2">
                  <span class="text-xs truncate" :class="t.unread ? 'text-slate-800 font-semibold' : 'text-slate-500'">
                    <span v-if="t.kind === 'direct' && t.lastFromMe">You: </span>{{ t.lastMessage }}
                  </span>
                  <span v-if="t.unread" class="count-badge shrink-0" :aria-label="`${t.unread} unread`">{{ t.unread > 9 ? '9+' : t.unread }}</span>
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </section>

    <!-- ================= Right: new group / one conversation ================= -->
    <section class="panel flex-col overflow-hidden" :class="rightOpen ? 'flex' : 'hidden md:flex'" aria-label="Conversation">
      <div v-if="!rightOpen" class="m-auto text-center p-8">
        <div class="w-16 h-16 bg-amber-100 text-brand-500 rounded-full flex items-center justify-center mx-auto text-2xl mb-3"><i class="fa-regular fa-message"></i></div>
        <p class="text-slate-500 text-sm">Select a conversation, or search for a user to start one.</p>
      </div>

      <!-- ---------- New group ---------- -->
      <form v-else-if="creatingGroup" class="flex-1 overflow-y-auto p-5 sm:p-6" novalidate @submit.prevent="createGroup">
        <div class="flex items-center gap-3 mb-4">
          <button type="button" class="btn btn-secondary btn-icon md:hidden" aria-label="Back" @click="creatingGroup = false"><i class="fa-solid fa-arrow-left"></i></button>
          <h2 class="text-xl font-bold text-slate-900"><i class="fa-solid fa-users text-brand-500 mr-2"></i>New group</h2>
        </div>
        <p v-if="groupError" class="alert-error mb-4" role="alert">{{ groupError }}</p>

        <label class="field-label" for="group-name">Group name</label>
        <input id="group-name" v-model="groupName" type="text" maxlength="60" class="field mb-4" placeholder="E.g. Sunday bakers">

        <p class="field-label">Members <span class="text-slate-400 font-semibold">({{ picked.length }} picked · 2 to {{ MAX_OTHERS }})</span></p>
        <div v-if="picked.length" class="flex flex-wrap gap-2 mb-3">
          <button v-for="p in picked" :key="p.id" type="button" class="tag !ml-0 tag-warn hover:bg-rose-100" :aria-label="`Remove ${p.username}`" @click="togglePick(p)">
            {{ p.username }} <i class="fa-solid fa-xmark ml-1"></i>
          </button>
        </div>
        <div class="relative mb-2">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-sm"></i>
          <input v-model="groupPeople.query.value" type="search" maxlength="50" class="field field-sm pl-9" placeholder="Search a user to add..." aria-label="Search a user to add to the group">
        </div>
        <p v-if="!groupPeople.list.value.length && !groupPeople.loading.value" class="text-sm text-slate-500 py-2">No user to show.</p>
        <ul v-else class="people-scroll-compact border border-orange-100 rounded-2xl p-1 mb-5" aria-label="People to add">
          <li v-for="p in groupPeople.list.value" :key="p.id">
            <button type="button" class="w-full h-full flex items-center gap-3 rounded-xl px-2 text-left hover:bg-orange-50" :aria-pressed="isPicked(p)" @click="togglePick(p)">
              <UserAvatar :name="p.username" :src="p.avatarUrl" size="sm" />
              <span class="min-w-0 flex-1 font-bold text-slate-900 truncate">{{ p.username }}</span>
              <span v-if="isFollowed(p)" class="tag !ml-0 shrink-0">Following</span>
              <i :class="isPicked(p) ? 'fa-solid fa-square-check text-brand-500' : 'fa-regular fa-square text-slate-300'"></i>
            </button>
          </li>
        </ul>

        <button type="submit" class="btn btn-primary btn-lg" :disabled="sending">
          <i :class="sending ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-users'"></i> Create group
        </button>
      </form>

      <!-- ---------- One conversation ---------- -->
      <template v-else>
        <header class="flex items-center gap-3 p-3 border-b border-orange-100">
          <button type="button" class="btn btn-secondary btn-icon md:hidden" aria-label="Back to conversations" @click="closeActive"><i class="fa-solid fa-arrow-left"></i></button>

          <!-- Direct -->
          <template v-if="data && data.kind === 'direct'">
            <RouterLink :to="`/users/${data.user.id}`" class="flex items-center gap-3 min-w-0 flex-1">
              <UserAvatar :name="data.user.username" :src="data.user.avatarUrl" size="md" />
              <span class="min-w-0">
                <span class="block font-bold text-slate-900 truncate">{{ data.user.username }}</span>
                <span v-if="data.user.role !== 'user'" class="tag !ml-0 tag-warn capitalize">{{ data.user.role }}</span>
              </span>
            </RouterLink>
            <button type="button" class="btn btn-secondary btn-icon" title="Report this person" aria-label="Report this person" @click="reportOpen = true"><i class="fa-regular fa-flag"></i></button>
            <button v-if="data.user.role === 'user'" type="button" class="btn btn-secondary btn-icon" :title="data.blockedByMe ? 'Unblock' : 'Block'" :aria-label="data.blockedByMe ? 'Unblock this person' : 'Block this person'" :disabled="busy" @click="toggleBlock">
              <i :class="data.blockedByMe ? 'fa-solid fa-lock-open' : 'fa-solid fa-ban'"></i>
            </button>
          </template>

          <!-- Group -->
          <template v-else-if="data && data.kind === 'group'">
            <span class="w-10 h-10 flex-none rounded-full bg-amber-200 text-brand-700 flex items-center justify-center" aria-hidden="true"><i class="fa-solid fa-users"></i></span>
            <span class="min-w-0 flex-1">
              <span class="block font-bold text-slate-900 truncate">{{ data.room.name }}</span>
              <span class="block text-xs text-slate-500">{{ data.members.length }} members</span>
            </span>
            <button type="button" class="btn btn-sm" :class="showMembers ? 'btn-primary' : 'btn-secondary'" :aria-expanded="showMembers" @click="showMembers = !showMembers">
              <i class="fa-solid fa-user-group"></i> Members
            </button>
          </template>

          <p v-else-if="!threadError" class="text-sm text-slate-500 flex-1"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</p>
          <span v-else class="flex-1"></span>
        </header>

        <!-- Group members panel -->
        <div v-if="data && data.kind === 'group' && showMembers" class="border-b border-orange-100 bg-white p-3 max-h-[55%] overflow-y-auto">
          <form v-if="data.room.isOwner" class="flex gap-2 mb-3" @submit.prevent="rename">
            <label class="sr-only" for="group-rename">Group name</label>
            <input id="group-rename" v-model="renameDraft" type="text" maxlength="60" class="field field-sm">
            <button type="submit" class="btn btn-secondary btn-sm" :disabled="busy || renameDraft.trim() === data.room.name">Rename</button>
          </form>

          <ul class="mb-3">
            <li v-for="m in data.members" :key="m.id" class="flex items-center gap-3 py-1.5">
              <RouterLink :to="`/users/${m.id}`" class="flex items-center gap-3 min-w-0 flex-1">
                <UserAvatar :name="m.username" :src="m.avatarUrl" size="sm" />
                <span class="font-semibold text-slate-800 truncate">{{ m.username }}<span v-if="m.id === userId" class="text-slate-400 font-normal"> (you)</span></span>
              </RouterLink>
              <span v-if="m.id === ownerId" class="tag !ml-0 tag-warn">Creator</span>
              <button v-if="data.room.isOwner && m.id !== userId" type="button" class="text-slate-400 hover:text-rose-600 p-1" :title="`Remove ${m.username}`" :aria-label="`Remove ${m.username} from the group`" :disabled="busy" @click="removeMember(m)"><i class="fa-solid fa-user-minus"></i></button>
            </li>
          </ul>

          <template v-if="data.room.isOwner && data.members.length < MAX_MEMBERS">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Add people</p>
            <div class="relative mb-2">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-sm"></i>
              <input v-model="addPeople.query.value" type="search" maxlength="50" class="field field-sm pl-9" placeholder="Search a user to add..." aria-label="Search a user to add">
            </div>
            <p v-if="!addable.length" class="text-sm text-slate-500 py-1">Nobody else to add.</p>
            <ul v-else class="people-scroll-compact">
              <li v-for="p in addable" :key="p.id">
                <div class="h-full flex items-center gap-3 px-2">
                  <UserAvatar :name="p.username" :src="p.avatarUrl" size="sm" />
                  <span class="min-w-0 flex-1 font-bold text-slate-900 truncate">{{ p.username }}</span>
                  <button type="button" class="btn btn-secondary btn-sm" :disabled="busy" @click="addMember(p)"><i class="fa-solid fa-plus"></i> Add</button>
                </div>
              </li>
            </ul>
          </template>

          <button type="button" class="btn btn-secondary btn-sm mt-3 !text-rose-600" :disabled="busy" @click="leaveGroup"><i class="fa-solid fa-right-from-bracket"></i> Leave group</button>
        </div>

        <!-- Messages -->
        <div ref="scroller" class="flex-1 overflow-y-auto bg-amber-50/40 p-4 space-y-2" aria-live="polite">
          <p v-if="threadError" class="alert-error" role="alert">{{ threadError }}</p>
          <p v-else-if="data && !messages.length" class="text-center text-sm text-slate-500 py-10">
            {{ data.kind === 'group' ? 'No message yet. Start the conversation!' : `No message yet. Say hello to ${data.user.username}!` }}
          </p>
          <div v-for="m in messages" :key="m.id" class="group flex items-end gap-1.5" :class="m.mine ? 'justify-end' : 'justify-start'">
            <UserAvatar v-if="data.kind === 'group' && !m.mine" :name="m.senderName" :src="m.senderAvatar" size="xs" class="mb-0.5" />
            <button v-if="m.mine && !m.isDeleted" type="button" class="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-rose-600 text-xs p-1 shrink-0" title="Delete this message" aria-label="Delete this message" @click="remove(m)">
              <i class="fa-regular fa-trash-can"></i>
            </button>
            <div class="flex flex-col min-w-0 max-w-[80%]" :class="m.mine ? 'items-end' : 'items-start'">
              <span v-if="data.kind === 'group' && !m.mine" class="text-[11px] font-bold text-brand-700 px-1 mb-0.5">{{ m.senderName }}</span>
              <p class="bubble" :class="m.isDeleted ? 'bubble-deleted' : (m.mine ? 'bubble-mine' : 'bubble-theirs')">{{ m.isDeleted ? 'Message deleted' : m.content }}<span class="bubble-time">{{ shortTime(m.createdAt) }}</span></p>
            </div>
          </div>
        </div>

        <!-- Composer -->
        <footer class="border-t border-orange-100 p-3">
          <p v-if="sendError" class="alert-error mb-2" role="alert">{{ sendError }}</p>

          <div v-if="isRestricted" class="notice notice-warn !mb-0">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>Your account is suspended, so you cannot send messages. <RouterLink to="/messages?tab=contact" class="underline font-bold">Contact the staff</RouterLink> if you think this is a mistake.</span>
          </div>
          <div v-else-if="data && data.kind === 'direct' && data.blockedByMe" class="notice notice-warn !mb-0">
            <i class="fa-solid fa-ban"></i>
            <span class="flex-1">You blocked {{ data.user.username }}.</span>
            <button type="button" class="underline font-bold" @click="toggleBlock">Unblock</button>
          </div>
          <form v-else-if="data" class="flex items-end gap-2" @submit.prevent="send">
            <label class="sr-only" for="chat-draft">Your message</label>
            <textarea id="chat-draft" ref="draftEl" v-model="draft" rows="1" :maxlength="MAX" class="field resize-none max-h-32" placeholder="Write a message..." @keydown.enter.exact.prevent="send" @input="autoGrow"></textarea>
            <button type="submit" class="btn btn-primary btn-lg" :disabled="sending || !draft.trim()" aria-label="Send">
              <i :class="sending ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'"></i>
            </button>
          </form>
          <p v-if="data && !isRestricted && draft.length > MAX - 200" class="text-[11px] text-slate-400 text-right mt-1">{{ draft.length }} / {{ MAX }}</p>
        </footer>
      </template>
    </section>

    <ReportModal v-if="reportOpen && data && data.kind === 'direct'" :target="{ type: 'user', id: data.user.id, kind: 'This person', label: data.user.username }" @close="reportOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UserAvatar from './UserAvatar.vue'
import ReportModal from './ReportModal.vue'
import { apiFetch } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { useRoles } from '../composables/useRoles'
import { useMessages } from '../composables/useMessages'
import { useFollowing } from '../composables/useFollowing'

const MAX = 2000
const MAX_MEMBERS = 20          // creator included (same limit as the server)
const MAX_OTHERS = MAX_MEMBERS - 1
const POLL_MS = 5000

const route = useRoute()
const router = useRouter()
const { userId } = useAuth()
const { isRestricted } = useRoles()
const { refreshUnread } = useMessages()
const { followingIds, loadFollowing } = useFollowing()

const isFollowed = (p) => p.isFollowing === true || followingIds.value.has(p.id)

// ==========================================================================
// People search (left list, "new group" and "add people" use the same logic).
// Empty box: the people I follow come first, then recent members. Typing: followed people first.
// ==========================================================================
function usePeopleSearch() {
  const query = ref('')
  const list = ref([])
  const loading = ref(false)
  const error = ref('')
  let timer = null
  let seq = 0   // an older answer never replaces a newer one

  async function refresh() {
    const text = query.value.trim()
    const mySeq = ++seq
    loading.value = true
    try {
      const data = await apiFetch(`/users/search?q=${encodeURIComponent(text)}&mode=followed-first`)
      if (mySeq !== seq) return
      list.value = text ? [...data].sort((a, b) => Number(isFollowed(b)) - Number(isFollowed(a))) : data
      error.value = ''
    } catch (e) {
      if (mySeq === seq) error.value = e.message
    } finally {
      if (mySeq === seq) loading.value = false
    }
  }
  watch(query, (value) => {
    clearTimeout(timer)
    timer = setTimeout(refresh, value.trim() ? 300 : 0)
  })
  onBeforeUnmount(() => clearTimeout(timer))
  return { query, list, loading, error, refresh }
}

const people = usePeopleSearch()
const groupPeople = usePeopleSearch()
const addPeople = usePeopleSearch()

// ==========================================================================
// Conversations list (direct chats and groups)
// ==========================================================================
const threads = ref([])
const loadingThreads = ref(true)
const listError = ref('')

const threadKey = (t) => (t.kind === 'group' ? `g${t.roomId}` : `u${t.userId}`)
async function loadThreads() {
  try {
    threads.value = await apiFetch('/messages/threads')
    listError.value = ''
  } catch (e) {
    listError.value = e.message
  } finally {
    loadingThreads.value = false
  }
}

// ==========================================================================
// The open conversation: { kind: 'direct' | 'group', id }  (user id or room id)
// ==========================================================================
const active = ref(null)
const creatingGroup = ref(false)
const data = ref(null)           // direct: { kind, user, messages, blockedByMe } · group: { kind, room, members, messages }
const threadError = ref('')
const scroller = ref(null)
const showMembers = ref(false)
let loadSeq = 0

const rightOpen = computed(() => !!active.value || creatingGroup.value)
const messages = computed(() => (data.value ? data.value.messages : []))
const ownerId = computed(() => (data.value && data.value.kind === 'group' ? data.value.room.createdBy : null))
const isActive = (t) => !!active.value && active.value.kind === t.kind && active.value.id === (t.kind === 'group' ? t.roomId : t.userId)

const nearBottom = () => {
  const el = scroller.value
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80
}
const scrollToBottom = () => nextTick(() => { if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight })

async function loadActive({ silent = false } = {}) {
  const current = active.value
  if (!current) return
  const seq = ++loadSeq
  try {
    const path = current.kind === 'group' ? `/messages/groups/${current.id}` : `/messages/threads/${current.id}`
    const result = await apiFetch(path)
    const now = active.value
    if (seq !== loadSeq || !now || now.kind !== current.kind || now.id !== current.id) return
    const stick = !silent || nearBottom()
    const lastBefore = data.value && data.value.messages.length ? data.value.messages.at(-1).id : null
    data.value = { kind: current.kind, ...result }
    threadError.value = ''
    if (current.kind === 'group' && !renameDraft.value) renameDraft.value = result.room.name
    if (stick) scrollToBottom()
    const lastAfter = result.messages.length ? result.messages.at(-1).id : null
    if (!silent || lastAfter !== lastBefore) { refreshUnread(); loadThreads() }
  } catch (e) {
    if (seq !== loadSeq) return
    threadError.value = e.message
    if (e.status === 404) data.value = null
  }
}

function resetThreadState() {
  data.value = null
  threadError.value = ''
  sendError.value = ''
  draft.value = ''
  showMembers.value = false
  renameDraft.value = ''
}

function openActive(kind, id) {
  if (active.value && active.value.kind === kind && active.value.id === id && !creatingGroup.value) return
  creatingGroup.value = false
  active.value = { kind, id }
  resetThreadState()
  // The address keeps the open conversation (refresh, back button)
  router.replace({ query: { ...route.query, tab: undefined, user: kind === 'direct' ? String(id) : undefined, group: kind === 'group' ? String(id) : undefined } })
  loadActive()
}

const openThread = (t) => (t.kind === 'group' ? openActive('group', t.roomId) : openActive('direct', t.userId))
const openFromPeople = (id) => { people.query.value = ''; openActive('direct', id) }

function closeActive() {
  active.value = null
  creatingGroup.value = false
  data.value = null
  loadSeq++
  router.replace({ query: { ...route.query, user: undefined, group: undefined } })
}

// ==========================================================================
// Sending, deleting
// ==========================================================================
const draft = ref('')
const draftEl = ref(null)
const sending = ref(false)
const sendError = ref('')
const busy = ref(false)

function autoGrow() {
  const el = draftEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 128) + 'px'
}

async function send() {
  const content = draft.value.trim()
  const current = active.value
  if (!content || sending.value || !current) return
  sending.value = true
  sendError.value = ''
  try {
    const path = current.kind === 'group' ? `/messages/groups/${current.id}` : `/messages/threads/${current.id}`
    const { message } = await apiFetch(path, { method: 'POST', body: { content } })
    if (data.value) data.value.messages.push(message)
    draft.value = ''
    nextTick(autoGrow)
    scrollToBottom()
    loadThreads()
  } catch (e) {
    sendError.value = e.message
  } finally {
    sending.value = false
  }
}

async function remove(message) {
  if (!window.confirm('Delete this message for everyone?')) return
  try {
    await apiFetch(`/messages/${message.id}`, { method: 'DELETE' })
    message.isDeleted = true
    message.content = null
    loadThreads()
  } catch (e) {
    sendError.value = e.message
  }
}

// ==========================================================================
// Direct chat: block / report
// ==========================================================================
const reportOpen = ref(false)

async function toggleBlock() {
  if (!data.value || data.value.kind !== 'direct') return
  const name = data.value.user.username
  const blocking = !data.value.blockedByMe
  if (blocking && !window.confirm(`Block ${name}? You will not be able to message each other until you unblock them.`)) return
  busy.value = true
  sendError.value = ''
  try {
    const result = await apiFetch(`/messages/blocks/${data.value.user.id}`, { method: blocking ? 'POST' : 'DELETE' })
    data.value.blockedByMe = result.blockedByMe
    loadThreads()
  } catch (e) {
    sendError.value = e.message
  } finally {
    busy.value = false
  }
}

// ==========================================================================
// Groups: create, rename, add / remove people, leave
// ==========================================================================
const groupName = ref('')
const groupError = ref('')
const picked = ref([])   // [{ id, username }]
const isPicked = (p) => picked.value.some(x => x.id === p.id)

function startGroup() {
  active.value = null
  data.value = null
  loadSeq++
  router.replace({ query: { ...route.query, user: undefined, group: undefined } })
  creatingGroup.value = true
  groupName.value = ''
  groupError.value = ''
  picked.value = []
  groupPeople.query.value = ''
  groupPeople.refresh()
}

function togglePick(p) {
  groupError.value = ''
  if (isPicked(p)) { picked.value = picked.value.filter(x => x.id !== p.id); return }
  if (picked.value.length >= MAX_OTHERS) { groupError.value = `A group can have ${MAX_MEMBERS} people at most, including you.`; return }
  picked.value = [...picked.value, { id: p.id, username: p.username }]
}

async function createGroup() {
  groupError.value = ''
  if (groupName.value.trim().length < 2) return (groupError.value = 'Please give your group a name (at least 2 characters).')
  if (picked.value.length < 2) return (groupError.value = 'Pick at least 2 other people. For one person, send a direct message.')
  sending.value = true
  try {
    const { roomId } = await apiFetch('/messages/groups', { method: 'POST', body: { name: groupName.value.trim(), memberIds: picked.value.map(p => p.id) } })
    await loadThreads()
    openActive('group', roomId)
  } catch (e) {
    groupError.value = e.message
  } finally {
    sending.value = false
  }
}

const renameDraft = ref('')
const addable = computed(() => {
  if (!data.value || data.value.kind !== 'group') return []
  const inGroup = new Set(data.value.members.map(m => m.id))
  return addPeople.list.value.filter(p => !inGroup.has(p.id))
})
watch(showMembers, (open) => { if (open) addPeople.refresh() })

async function groupAction(fn) {
  busy.value = true
  sendError.value = ''
  try {
    await fn()
  } catch (e) {
    sendError.value = e.message
  } finally {
    busy.value = false
  }
}

const rename = () => groupAction(async () => {
  const { name } = await apiFetch(`/messages/groups/${active.value.id}`, { method: 'PATCH', body: { name: renameDraft.value.trim() } })
  data.value.room.name = name
  loadThreads()
})
const addMember = (p) => groupAction(async () => {
  await apiFetch(`/messages/groups/${active.value.id}/members`, { method: 'POST', body: { userIds: [p.id] } })
  await loadActive({ silent: true })
})
const removeMember = (m) => {
  if (!window.confirm(`Remove ${m.username} from the group?`)) return
  return groupAction(async () => {
    await apiFetch(`/messages/groups/${active.value.id}/members/${m.id}`, { method: 'DELETE' })
    await loadActive({ silent: true })
  })
}
const leaveGroup = () => {
  if (!window.confirm('Leave this group? You will not see its messages anymore.')) return
  return groupAction(async () => {
    await apiFetch(`/messages/groups/${active.value.id}/members/${userId.value}`, { method: 'DELETE' })
    closeActive()
    loadThreads()
    refreshUnread()
  })
}

// ==========================================================================
// Display
// ==========================================================================
const shortTime = (value) => {
  const d = new Date(value)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Deep links: /messages?user=12 (profile, Community) and /messages?group=5
// Placé après les déclarations ci-dessus : `openActive()` s'en sert dès l'ouverture de la page.
watch(() => [route.query.user, route.query.group], ([user, group]) => {
  const groupId = Number(group)
  const personId = Number(user)
  if (Number.isInteger(groupId) && groupId > 0) openActive('group', groupId)
  else if (Number.isInteger(personId) && personId > 0) openActive('direct', personId)
  else if (active.value) { active.value = null; data.value = null }
}, { immediate: true })

// Regular refresh (no WebSocket needed), paused while the browser tab is hidden
let timer = null
onMounted(() => {
  loadFollowing()
  people.refresh()
  loadThreads()
  timer = setInterval(() => {
    if (document.hidden) return
    loadThreads()
    if (active.value) loadActive({ silent: true })
  }, POLL_MS)
})
onBeforeUnmount(() => clearInterval(timer))
</script>
