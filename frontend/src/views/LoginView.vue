<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p class="text-gray-500 mt-1">Sign in to your SignFlow account</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="card p-6 space-y-4">
        <div v-if="error" class="p-3 bg-danger-50 text-danger-600 rounded-lg text-sm">
          {{ error }}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="input"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="input"
            placeholder="••••••••"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="flex items-center">
            <input type="checkbox" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span class="ml-2 text-sm text-gray-600">Remember me</span>
          </label>
          <a href="#" class="text-sm text-primary-600 hover:text-primary-700">Forgot password?</a>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full btn-primary py-2.5"
        >
          <span v-if="loading" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in...
          </span>
          <span v-else>Sign in</span>
        </button>
      </form>

      <p class="text-center mt-6 text-sm text-gray-600">
        Don't have an account?
        <router-link to="/register" class="text-primary-600 hover:text-primary-700 font-medium">
          Sign up
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''

  const success = await authStore.login(email.value, password.value)

  if (success) {
    const redirect = route.query.redirect as string
    router.push(redirect || '/dashboard')
  } else {
    error.value = authStore.error || 'Invalid credentials'
  }

  loading.value = false
}
</script>