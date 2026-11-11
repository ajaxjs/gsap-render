import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/demo/:id', name: 'demo', component: () => import('./views/DemoView.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
