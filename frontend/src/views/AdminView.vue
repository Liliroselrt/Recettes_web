<template>
  <div class="max-w-6xl mx-auto">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900"><i class="fa-solid fa-user-shield text-brand-500 mr-2"></i>Admin panel</h1>
        <p class="text-slate-600 mt-1 text-sm">Overview of the site, accounts and roles.</p>
      </div>
      <div v-if="isAdmin" class="flex gap-2">
        <button v-for="t in TABS" :key="t.value" type="button" :class="tab === t.value ? 'pill pill-active' : 'pill'" @click="openTab(t.value)">{{ t.label }}</button>
      </div>
    </header>

    <p v-if="!isAdmin" class="alert-error" role="alert">You do not have access to this page.</p>

    <template v-else>
      <p v-if="error" class="alert-error mb-4" role="alert">{{ error }}</p>

      <!-- Overview -->
      <section v-if="tab === 'overview' && stats" class="space-y-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="panel p-5">
            <p class="text-xs font-semibold text-slate-500">Users</p>
            <p class="text-3xl font-extrabold text-slate-900">{{ stats.users.total }}</p>
            <p class="text-xs text-slate-500">{{ stats.users.newThisWeek }} new this week</p>
          </div>
          <div class="panel p-5">
            <p class="text-xs font-semibold text-slate-500">Recipes</p>
            <p class="text-3xl font-extrabold text-slate-900">{{ stats.recipes.total }}</p>
            <p class="text-xs text-slate-500">{{ stats.recipes.shared }} shared, {{ stats.recipes.private }} private</p>
          </div>
          <div class="panel p-5">
            <p class="text-xs font-semibold text-slate-500">Subscribers</p>
            <p class="text-3xl font-extrabold text-slate-900">{{ stats.subscriptions.subscribers }}</p>
            <p class="text-xs text-slate-500">R{{ stats.subscriptions.monthlyRevenue.toFixed(2) }} per month</p>
          </div>
          <RouterLink to="/moderation" class="panel p-5 block hover:border-brand-400">
            <p class="text-xs font-semibold text-slate-500">Reports waiting</p>
            <p class="text-3xl font-extrabold" :class="stats.reports.pending ? 'text-rose-600' : 'text-slate-900'">{{ stats.reports.pending }}</p>
            <p class="text-xs text-brand-600 font-semibold">Open moderation <i class="fa-solid fa-arrow-right"></i></p>
          </RouterLink>
        </div>

        <div class="grid lg:grid-cols-3 gap-4">
          <div class="panel p-5">
            <h2 class="font-bold text-slate-900 mb-3">New accounts per week</h2>
            <p v-if="!stats.signups.length" class="text-sm text-slate-500">No sign-up in the last 12 weeks.</p>
            <div v-for="s in stats.signups" :key="s.week" class="flex items-center gap-2 text-xs mb-1.5">
              <span class="w-20 text-slate-500 shrink-0">{{ s.week }}</span>
              <span class="h-3 rounded bg-brand-500" :style="{ width: Math.max(4, (s.count / maxSignups) * 100) + '%' }"></span>
              <span class="font-bold text-slate-700">{{ s.count }}</span>
            </div>
          </div>
          <div class="panel p-5">
            <h2 class="font-bold text-slate-900 mb-3">Reports by reason</h2>
            <p v-if="!stats.reports.byReason.length" class="text-sm text-slate-500">No report yet.</p>
            <div v-for="x in stats.reports.byReason" :key="x.reason" class="flex justify-between text-sm py-1 border-b border-orange-50 last:border-0">
              <span class="text-slate-700">{{ REASON_LABELS[x.reason] || x.reason }}</span>
              <span class="font-bold text-slate-900">{{ x.count }}</span>
            </div>
          </div>
          <div class="panel p-5">
            <h2 class="font-bold text-slate-900 mb-3">Best rated recipes</h2>
            <p v-if="!stats.topRecipes.length" class="text-sm text-slate-500">No review yet.</p>
            <div v-for="x in stats.topRecipes" :key="x.id" class="flex justify-between gap-3 text-sm py-1 border-b border-orange-50 last:border-0">
              <span class="text-slate-700 truncate">{{ x.title }}</span>
              <span class="font-bold text-amber-500 shrink-0"><i class="fa-solid fa-star mr-1"></i>{{ x.rating }} <span class="text-slate-400 font-normal">({{ x.reviews }})</span></span>
            </div>
          </div>
        </div>

        <div class="grid sm:grid-cols-3 gap-4 text-sm">
          <div class="panel p-5">
            <h2 class="font-bold text-slate-900 mb-2">Accounts</h2>
            <p class="text-slate-600">{{ stats.users.admins }} admin(s), {{ stats.users.moderators }} moderator(s)</p>
            <p class="text-slate-600">{{ stats.users.banned }} suspended</p>
          </div>
          <div class="panel p-5">
            <h2 class="font-bold text-slate-900 mb-2">Recipes</h2>
            <p class="text-slate-600">{{ stats.recipes.withVideo }} with a video</p>
            <p class="text-slate-600">{{ stats.recipes.hidden }} hidden by moderation</p>
          </div>
          <div class="panel p-5">
            <h2 class="font-bold text-slate-900 mb-2">Payments (ZAR)</h2>
            <p class="text-slate-600">R{{ stats.subscriptions.totalPaid.toFixed(2) }} in {{ stats.subscriptions.payments }} payment(s)</p>
          </div>
        </div>
      </section>

      <!-- Users -->
      <section v-if="tab === 'users'">
        <form class="panel p-4 mb-4 flex flex-wrap items-end gap-3" @submit.prevent="loadUsers">
          <div class="grow min-w-[12rem]">
            <label class="field-label" for="user-search">Search</label>
            <input id="user-search" v-model="filters.search" type="text" class="field field-sm" placeholder="Name or email">
          </div>
          <div>
            <label class="field-label" for="user-role">Role</label>
            <select id="user-role" v-model="filters.role" class="field field-sm field-auto">
              <option value="">All</option><option value="user">User</option><option value="moderator">Moderator</option><option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label class="field-label" for="user-filter">Show</label>
            <select id="user-filter" v-model="filters.filter" class="field field-sm field-auto">
              <option value="">Everyone</option><option value="reported">Reported at least once</option>
              <option value="banned">Suspended</option><option value="no_reporting">Cannot report</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-sm"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
        </form>

        <p v-if="loadingUsers" class="text-sm text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Loading...</p>
        <div v-else class="panel overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-xs text-slate-500 border-b border-orange-100">
              <tr><th class="p-3">User</th><th class="p-3">Role</th><th class="p-3">Activity</th><th class="p-3">Reporting</th><th class="p-3">Account</th></tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id" class="border-b border-orange-50 last:border-0 align-top">
                <td class="p-3">
                  <p class="font-bold text-slate-900">{{ u.username }} <span v-if="u.id === myId" class="tag">You</span></p>
                  <p class="text-xs text-slate-500">{{ u.email }}</p>
                  <p class="text-xs text-slate-400">Joined {{ formatDate(u.createdAt) }}</p>
                </td>
                <td class="p-3">
                  <span v-if="u.id === myId" class="tag">{{ u.role }}</span>
                  <select v-else class="field field-sm field-auto" :value="u.role" :disabled="busyId === u.id" :aria-label="'Role of ' + u.username" @change="changeRole(u, $event)">
                    <option value="user">User</option><option value="moderator">Moderator</option><option value="admin">Admin</option>
                  </select>
                </td>
                <td class="p-3 text-xs text-slate-600 space-y-0.5">
                  <p>{{ u.recipes }} recipe{{ u.recipes === 1 ? '' : 's' }}, {{ u.reviews }} review{{ u.reviews === 1 ? '' : 's' }}</p>
                  <p :class="u.reportsReceived ? 'text-rose-600 font-semibold' : ''">{{ u.reportsReceived }} report{{ u.reportsReceived === 1 ? '' : 's' }} received</p>
                  <p v-if="u.isSubscriber"><i class="fa-solid fa-star text-brand-500 mr-1"></i>Gourmet Plus</p>
                </td>
                <td class="p-3">
                  <template v-if="u.id !== myId">
                    <button v-if="u.canReport" type="button" class="btn btn-secondary btn-sm" :disabled="busyId === u.id" @click="removeReporting(u)">Remove ability</button>
                    <div v-else>
                      <span class="tag tag-warn">Removed</span>
                      <p v-if="u.reportBlockedReason" class="text-xs text-slate-500 mt-1 max-w-[12rem]">{{ u.reportBlockedReason }}</p>
                      <button type="button" class="btn btn-secondary btn-sm mt-1.5" :disabled="busyId === u.id" @click="patchUser(u, { canReport: true })">Restore</button>
                    </div>
                  </template>
                </td>
                <td class="p-3">
                  <template v-if="u.id !== myId">
                    <div v-if="u.isBanned">
                      <span class="tag tag-warn">Suspended</span>
                      <p v-if="u.bannedReason" class="text-xs text-slate-500 mt-1 max-w-[12rem]">{{ u.bannedReason }}</p>
                      <button type="button" class="btn btn-secondary btn-sm mt-1.5" :disabled="busyId === u.id" @click="reinstate(u)">Reinstate</button>
                    </div>
                    <button v-else-if="u.role !== 'admin'" type="button" class="btn btn-danger btn-sm" :disabled="busyId === u.id" @click="suspend(u)">Suspend</button>
                    <span v-else class="text-xs text-slate-400">Remove the admin role first</span>
                  </template>
                </td>
              </tr>
              <tr v-if="!users.length"><td colspan="5" class="p-6 text-center text-slate-500">No account matches.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Activity log -->
      <section v-if="tab === 'logs'">
        <p v-if="loadingLogs" class="text-sm text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Loading...</p>
        <div v-else class="panel divide-y divide-orange-50">
          <p v-if="!logs.length" class="p-6 text-center text-slate-500 text-sm">No action recorded yet.</p>
          <div v-for="l in logs" :key="l.id" class="p-4 text-sm flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="font-semibold text-slate-900">{{ LOG_LABELS[l.action] || l.action }}</p>
              <p class="text-xs text-slate-500">
                <span v-if="l.targetType">{{ l.targetType }} {{ l.targetName || '#' + l.targetId }}</span>
                <span v-if="l.details"> · {{ l.details }}</span>
              </p>
            </div>
            <p class="text-xs text-slate-500 text-right">{{ l.adminName || 'Deleted account' }}<br>{{ formatDateTime(l.createdAt) }}</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { apiFetch } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { useRoles } from '../composables/useRoles'
import { REASON_LABELS, formatDate, formatDateTime } from '../utils/reports'

const { userId: myId } = useAuth()
const { isAdmin } = useRoles()

const TABS = [{ value: 'overview', label: 'Overview' }, { value: 'users', label: 'Users' }, { value: 'logs', label: 'Activity log' }]
const LOG_LABELS = {
  role_changed: 'Role changed', user_banned: 'Account suspended', user_unbanned: 'Account reinstated',
  report_access_removed: 'Reporting ability removed', report_access_restored: 'Reporting ability restored',
  report_none: 'Report dismissed', report_warning: 'Warning sent', report_recipe_hidden: 'Recipe hidden',
  report_recipe_deleted: 'Recipe deleted', report_review_deleted: 'Review deleted', report_user_banned: 'Account suspended (report)'
}

const tab = ref('overview')
const error = ref('')
const stats = ref(null)
const users = ref([])
const logs = ref([])
const loadingUsers = ref(false)
const loadingLogs = ref(false)
const busyId = ref(null)
const filters = reactive({ search: '', role: '', filter: '' })
const maxSignups = computed(() => (stats.value ? Math.max(1, ...stats.value.signups.map(s => s.count)) : 1))

async function guarded(action) {
  error.value = ''
  try { await action() } catch (e) { error.value = e.message }
}

const loadStats = () => guarded(async () => { stats.value = await apiFetch('/admin/stats') })
const loadUsers = () => guarded(async () => {
  loadingUsers.value = true
  try {
    const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
    users.value = await apiFetch('/admin/users' + (query ? '?' + query : ''))
  } finally { loadingUsers.value = false }
})
const loadLogs = () => guarded(async () => {
  loadingLogs.value = true
  try { logs.value = await apiFetch('/admin/logs') } finally { loadingLogs.value = false }
})

function openTab(value) {
  tab.value = value
  if (value === 'overview') loadStats()
  if (value === 'users') loadUsers()
  if (value === 'logs') loadLogs()
}

async function patchUser(user, body) {
  busyId.value = user.id
  await guarded(async () => {
    await apiFetch(`/admin/users/${user.id}`, { method: 'PATCH', body })
    await loadUsers()
  })
  busyId.value = null
}

async function changeRole(user, event) {
  const role = event.target.value
  const message = role === 'admin'
    ? `Make ${user.username} an admin? Admins can change roles, suspend accounts and see all the statistics.`
    : `Change the role of ${user.username} to ${role}?`
  if (!window.confirm(message)) { event.target.value = user.role; return }
  await patchUser(user, { role })
}

async function suspend(user) {
  const reason = window.prompt(`Why is ${user.username} suspended? The person will read this message.`)
  if (reason && reason.trim().length >= 3) await patchUser(user, { isBanned: true, bannedReason: reason.trim() })
}
async function reinstate(user) {
  if (window.confirm(`Reinstate ${user.username}?`)) await patchUser(user, { isBanned: false })
}
async function removeReporting(user) {
  const reason = window.prompt(`Why can ${user.username} no longer report? The person will see this reason.`, 'Misuse of the reporting feature.')
  if (reason && reason.trim().length >= 3) await patchUser(user, { canReport: false, reportBlockedReason: reason.trim() })
}

watch(isAdmin, (allowed) => { if (allowed) loadStats() }, { immediate: true })
</script>
