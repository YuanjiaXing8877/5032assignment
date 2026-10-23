import { createRouter, createWebHistory } from 'vue-router'
import { authState, canAccess, initialiseAuth } from '../services/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { guestOnly: true } },
    { path: '/profile', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/activities/map', name: 'activity-map', component: () => import('../views/ActivityMapView.vue'), meta: { requiresAuth: true } },
    { path: '/email', name: 'email', component: () => import('../views/EmailView.vue'), meta: { requiresAuth: true } },
    { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue'), meta: { requiresAuth: true, roles: ['Administrator'] } },
    { path: '/unauthorised', name: 'unauthorised', component: () => import('../views/UnauthorisedView.vue'), meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }
    return { top: 0 }
  }
})

router.beforeEach(async (to) => {
  await initialiseAuth()

  if (to.meta.requiresAuth && !authState.user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.roles && !canAccess(to.meta.roles)) return { name: 'unauthorised' }
  if (to.meta.guestOnly && authState.user) return { name: authState.user.role === 'Administrator' ? 'admin' : 'profile' }
})

const titles = { login: 'Sign in', register: 'Create an account', profile: 'My account', 'activity-map': 'Find activities', email: 'Send email', admin: 'Administration', unauthorised: 'Access denied' }
router.afterEach((to) => { document.title = `${titles[to.name] || 'Home'} | GreenLink Melbourne` })

export default router
