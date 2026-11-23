<template>
  <li class="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-brand-50 transition-colors">
    <RouterLink :to="`/users/${person.id}`" class="flex items-center gap-3 min-w-0 flex-1">
      <UserAvatar :name="person.username" :src="person.avatarUrl" size="md" />
      <span class="min-w-0">
        <span class="block font-bold text-slate-900 truncate">{{ person.username }}</span>
        <span v-if="subtitle" class="block text-xs text-slate-500 truncate">{{ subtitle }}</span>
      </span>
    </RouterLink>
    <RouterLink v-if="showMessage" :to="`/messages?user=${person.id}`" class="btn btn-secondary btn-sm flex-none" :title="'Message ' + person.username" :aria-label="'Message ' + person.username">
      <i class="fa-regular fa-message"></i>
    </RouterLink>
    <button type="button" class="btn btn-sm flex-none" :class="isFollowing ? 'btn-secondary' : 'btn-primary'" :disabled="busy" :aria-pressed="isFollowing" :title="isFollowing ? 'Unfollow ' + person.username : 'Follow ' + person.username" @click="$emit('toggle', person)">
      <i :class="busy ? 'fa-solid fa-spinner fa-spin' : (isFollowing ? 'fa-solid fa-user-check' : 'fa-solid fa-user-plus')"></i>
      {{ isFollowing ? 'Following' : 'Follow' }}
    </button>
  </li>
</template>

<script setup>
import { computed } from 'vue'
import UserAvatar from './UserAvatar.vue'

const props = defineProps({
  person: { type: Object, required: true },   // { id, username, avatarUrl, specialty, location }
  isFollowing: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  showMessage: { type: Boolean, default: true }
})
defineEmits(['toggle'])

const subtitle = computed(() => [props.person.specialty, props.person.location].filter(Boolean).join(' · '))
</script>
