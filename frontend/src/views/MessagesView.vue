<template>
  <div class="max-w-6xl mx-auto">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900"><i class="fa-solid fa-message text-brand-500 mr-2"></i>Messages</h1>
        <p class="text-slate-500 text-sm mt-1">Chat with other cooks, or contact the moderators and admins.</p>
      </div>

      <div v-if="isLoggedIn" class="flex gap-2" role="tablist" aria-label="Messages sections">
        <button type="button" role="tab" :aria-selected="tab === 'chats'" :class="tab === 'chats' ? 'pill pill-active' : 'pill'" @click="goTo('chats')">
          <i class="fa-regular fa-comments mr-1"></i> Chats
          <span v-if="unread.chats > 0" class="count-badge ml-1">{{ unread.chats }}</span>
        </button>
        <!-- Staff only: the requests sent by the members -->
        <button v-if="isModerator" type="button" role="tab" :aria-selected="tab === 'support'" :class="tab === 'support' ? 'pill pill-active' : 'pill'" @click="goTo('support')">
          <i class="fa-solid fa-headset mr-1"></i> Support
          <span v-if="unread.inbox > 0" class="count-badge ml-1">{{ unread.inbox }}</span>
        </button>
        <!-- Everybody (staff included): write to the moderators and admins -->
        <button type="button" role="tab" :aria-selected="tab === 'contact'" :class="tab === 'contact' ? 'pill pill-active' : 'pill'" @click="goTo('contact')">
          <i class="fa-solid fa-life-ring mr-1"></i> Contact staff
          <span v-if="unread.support + unread.team > 0" class="count-badge ml-1">{{ unread.support + unread.team }}</span>
        </button>
      </div>
    </div>

    <div v-if="!isLoggedIn" class="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-brand-200">
      <div class="w-16 h-16 bg-brand-100 text-brand-500 rounded-full flex items-center justify-center mx-auto text-2xl mb-3"><i class="fa-regular fa-message"></i></div>
      <p class="text-slate-500 mb-5">Log in to chat with other cooks and contact the team.</p>
      <button type="button" class="btn btn-primary btn-lg" @click="openAuth"><i class="fa-solid fa-user"></i> Log in</button>
    </div>

    <ChatPanel v-else-if="tab === 'chats'" />
    <!-- :key restarts the panel when the tab changes -->
    <SupportPanel v-else :key="tab" :view="tab" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatPanel from '../components/ChatPanel.vue'
import SupportPanel from '../components/SupportPanel.vue'
import { useAuth } from '../composables/useAuth'
import { useUI } from '../composables/useUI'
import { useRoles } from '../composables/useRoles'
import { useMessages } from '../composables/useMessages'

const route = useRoute()
const router = useRouter()
const { isLoggedIn } = useAuth()
const { openAuth } = useUI()
const { isModerator } = useRoles()
const { unread } = useMessages()

// /messages (chats) · /messages?tab=support (staff: requests from the members) · /messages?tab=contact (write to the staff)
const tab = computed(() => {
  if (route.query.tab === 'contact') return 'contact'
  if (route.query.tab === 'support') return isModerator.value ? 'support' : 'contact'   // old links keep working
  return 'chats'
})
const goTo = (value) => router.push({ path: '/messages', query: value === 'chats' ? {} : { tab: value } })
</script>
