import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

// Les trois onglets de la maquette partagent la même vue ; `meta.tab` indique lequel est actif.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { tab: 'home' } },
    { path: '/my-creations', name: 'my-creations', component: HomeView, meta: { tab: 'my-creations' } },
    { path: '/favorites', name: 'favorites', component: HomeView, meta: { tab: 'favorites' } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

export default router
