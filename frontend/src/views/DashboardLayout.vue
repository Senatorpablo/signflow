<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div class="p-6 border-b border-gray-200">
        <router-link to="/dashboard" class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span class="text-xl font-bold text-gray-900">SignFlow</span>
        </router-link>
      </div>

      <nav class="flex-1 p-4 space-y-1">
        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.to"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            $route.path === item.to || $route.path.startsWith(item.to + '/')
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-700 hover:bg-gray-100'
          ]"
        >
          <component :is="item.icon" class="w-5 h-5" />
          {{ item.name }}
        </router-link>
      </nav>

      <!-- User profile -->
      <div class="p-4 border-t border-gray-200">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span class="text-sm font-medium text-primary-700">{{ userInitials }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ authStore.user?.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
          </div>
          <button @click="logout" class="p-1.5 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const navigation = [
  {
    name: 'Documents',
    to: '/dashboard/documents',
    icon: 'DocumentIcon',
  },
  {
    name: 'Templates',
    to: '/dashboard/templates',
    icon: 'TemplateIcon',
  },
  {
    name: 'Upload',
    to: '/dashboard/upload',
    icon: 'UploadIcon',
  },
  {
    name: 'Team',
    to: '/dashboard/team',
    icon: 'TeamIcon',
  },
  {
    name: 'Settings',
    to: '/dashboard/settings',
    icon: 'SettingsIcon',
  },
]

const userInitials = computed(() => {
  if (!authStore.user?.name) return '?'
  return authStore.user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>
