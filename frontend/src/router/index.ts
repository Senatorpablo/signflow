import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/dashboard',
    component: () => import('@/views/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/DocumentListView.vue'),
      },
      {
        path: 'documents',
        name: 'Documents',
        component: () => import('@/views/DocumentListView.vue'),
      },
      {
        path: 'templates',
        name: 'Templates',
        component: () => import('@/views/TemplateManagerView.vue'),
      },
      {
        path: 'upload',
        name: 'Upload',
        component: () => import('@/views/UploadView.vue'),
      },
      {
        path: 'documents/:id',
        name: 'DocumentDetail',
        component: () => import('@/views/DocumentDetailView.vue'),
      },
      {
        path: 'templates/:id/build',
        name: 'TemplateBuilder',
        component: () => import('@/views/TemplateBuilderView.vue'),
      },
      {
        path: 'team',
        name: 'Team',
        component: () => import('@/views/TeamView.vue'),
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/SettingsView.vue'),
      },
    ],
  },
  {
    path: '/sign/:token',
    name: 'Sign',
    component: () => import('@/views/SigningView.vue'),
    meta: { public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
