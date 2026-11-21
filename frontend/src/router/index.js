import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PlansView from '../views/PlansView.vue'
import MyReportsView from '../views/MyReportsView.vue'
import ModerationView from '../views/ModerationView.vue'
import AdminView from '../views/AdminView.vue'
import ProfileView from '../views/ProfileView.vue'
import SettingsView from '../views/SettingsView.vue'
import HistoryView from '../views/HistoryView.vue'
import FollowingView from '../views/FollowingView.vue'
import MessagesView from '../views/MessagesView.vue'

// Les trois onglets de la maquette partagent la même vue ; `meta.tab` indique lequel est actif.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { tab: 'home' } },
    { path: '/my-creations', name: 'my-creations', component: HomeView, meta: { tab: 'my-creations' } },
    { path: '/users/:id(\\d+)', name: 'profile', component: ProfileView, meta: { tab: 'profile' } },
    { path: '/settings', name: 'settings', component: SettingsView, meta: { tab: 'settings' } },
    { path: '/following', name: 'following', component: FollowingView, meta: { tab: 'following' } },
    { path: '/messages', name: 'messages', component: MessagesView, meta: { tab: 'messages' } },
    { path: '/history', name: 'history', component: HistoryView, meta: { tab: 'history' } },
    { path: '/plans', name: 'plans', component: PlansView, meta: { tab: 'plans' } },
    { path: '/my-reports', name: 'my-reports', component: MyReportsView, meta: { tab: 'my-reports' } },
    { path: '/moderation', name: 'moderation', component: ModerationView, meta: { tab: 'moderation' } },
    { path: '/admin', name: 'admin', component: AdminView, meta: { tab: 'admin' } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

export default router
