import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PlansView from '../views/PlansView.vue'
import MyReportsView from '../views/MyReportsView.vue'
import ModerationView from '../views/ModerationView.vue'
import AdminView from '../views/AdminView.vue'

// Les trois onglets de la maquette partagent la même vue ; `meta.tab` indique lequel est actif.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { tab: 'home' } },
    { path: '/my-creations', name: 'my-creations', component: HomeView, meta: { tab: 'my-creations' } },
    { path: '/favorites', name: 'favorites', component: HomeView, meta: { tab: 'favorites' } },
    { path: '/plans', name: 'plans', component: PlansView, meta: { tab: 'plans' } },
    { path: '/my-reports', name: 'my-reports', component: MyReportsView, meta: { tab: 'my-reports' } },
    { path: '/moderation', name: 'moderation', component: ModerationView, meta: { tab: 'moderation' } },
    { path: '/admin', name: 'admin', component: AdminView, meta: { tab: 'admin' } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

export default router
