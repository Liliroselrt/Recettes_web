<template>
  <div class="max-w-2xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900"><i class="fa-solid fa-user-pen text-brand-500 mr-2"></i>Profile settings</h1>
      <p class="text-slate-500 text-sm mt-1">This is what other cooks see when they open your profile.</p>
    </div>

    <!-- Logged out -->
    <div v-if="!isLoggedIn" class="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-amber-200">
      <h3 class="text-xl font-bold text-slate-900 mb-2">Log in to edit your profile</h3>
      <p class="text-slate-500 mb-6">Your profile picture and bio are linked to your account.</p>
      <button type="button" class="btn btn-primary btn-lg" @click="openAuth"><i class="fa-solid fa-user"></i> Log in</button>
    </div>

    <p v-else-if="loading" class="text-center text-slate-500 py-16">
      <i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading your profile...
    </p>
    <div v-else-if="loadError" class="alert-error my-8">
      {{ loadError }} <button type="button" class="underline font-bold ml-2" @click="load">Try again</button>
    </div>

    <form v-else class="panel p-6 sm:p-8 space-y-6" novalidate @submit.prevent="save">
      <!-- Profile picture -->
      <div>
        <p class="field-label">Profile picture</p>
        <div class="flex flex-wrap items-center gap-5">
          <!-- Live preview of the link typed on the right -->
          <UserAvatar :name="username" :src="avatar.trim() || null" size="xl" class="border-4 border-brand-500 shadow-md" />
          <div class="flex-1 min-w-[14rem]">
            <label class="sr-only" for="profile-avatar">Profile picture link</label>
            <input id="profile-avatar" v-model="avatar" type="url" maxlength="2000" class="field" placeholder="https://images.unsplash.com/photo-...">
            <p class="text-xs text-slate-500 mt-2">
              Paste the link of a picture (right-click it, then <em>“Copy image address”</em>). Leave it empty to show your initial instead.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label class="field-label" for="profile-bio">Bio</label>
        <textarea id="profile-bio" v-model="form.bio" rows="5" :maxlength="MAX_BIO" class="field" placeholder="Tell the community who you are, what you love to cook..."></textarea>
        <p class="text-xs text-slate-400 text-right mt-1">{{ form.bio.length }}/{{ MAX_BIO }}</p>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="field-label" for="profile-specialty">Specialty</label>
          <input id="profile-specialty" v-model="form.specialty" type="text" maxlength="150" class="field" placeholder="E.g. Pastry, Italian cuisine">
        </div>
        <div>
          <label class="field-label" for="profile-location">Location</label>
          <input id="profile-location" v-model="form.location" type="text" maxlength="150" class="field" placeholder="E.g. Paris, France">
        </div>
      </div>

      <div>
        <label class="field-label" for="profile-website">Website</label>
        <input id="profile-website" v-model="form.websiteUrl" type="url" maxlength="255" class="field" placeholder="https://my-blog.com">
      </div>

      <p v-if="errorMessage" role="alert" class="alert-error">{{ errorMessage }}</p>
      <p v-if="saved" role="status" class="notice notice-ok">
        <i class="fa-solid fa-circle-check"></i>
        <span>Your profile was saved. <RouterLink :to="`/users/${userId}`" class="font-bold underline">See my public profile</RouterLink></span>
      </p>

      <div class="flex flex-wrap gap-3">
        <button type="submit" class="btn btn-primary btn-lg" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-floppy-disk'"></i> {{ saving ? 'Saving...' : 'Save my profile' }}
        </button>
        <RouterLink :to="`/users/${userId}`" class="btn btn-secondary btn-lg">View my profile</RouterLink>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import UserAvatar from '../components/UserAvatar.vue'
import { apiFetch } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { useUI } from '../composables/useUI'
import { useRoles } from '../composables/useRoles'

const MAX_BIO = 500

const { token, userId, username, isLoggedIn } = useAuth()
const { openAuth } = useUI()
const { profile: sessionProfile } = useRoles()

const loading = ref(true)
const loadError = ref('')
const form = reactive({ bio: '', specialty: '', location: '', websiteUrl: '' })
// Link of the profile picture (stored in Users.avatarUrl)
const avatar = ref('')
const saving = ref(false)
const saved = ref(false)
const errorMessage = ref('')

function fill(data) {
  form.bio = data.bio || ''
  form.specialty = data.specialty || ''
  form.location = data.location || ''
  form.websiteUrl = data.websiteUrl || ''
  avatar.value = data.avatarUrl || ''
}

async function load() {
  if (!token.value) { loading.value = false; return }
  loading.value = true
  loadError.value = ''
  try {
    fill(await apiFetch('/auth/me'))
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}
watch(token, load, { immediate: true })

async function save() {
  saving.value = true
  saved.value = false
  errorMessage.value = ''
  try {
    const avatarUrl = avatar.value.trim()
    // Same rule as the server: a web link (or a picture already saved on the server by an older version)
    if (avatarUrl && !/^https?:\/\/\S+$/i.test(avatarUrl) && !/^\/img\/[\w.-]+$/.test(avatarUrl)) {
      errorMessage.value = 'The picture must be a link starting with https://'
      return
    }
    const result = await apiFetch('/users/me/profile', {
      method: 'PUT',
      body: { bio: form.bio, specialty: form.specialty, location: form.location, websiteUrl: form.websiteUrl, avatarUrl }
    })
    fill(result.user)
    // The navbar reads the session profile: update it without reloading the page
    if (sessionProfile.value) sessionProfile.value = { ...sessionProfile.value, ...result.user }
    saved.value = true
  } catch (e) {
    errorMessage.value = e.message
  } finally {
    saving.value = false
  }
}
</script>
