import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/authApi'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: string
  organization?: {
    id: string
    name: string
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string>(localStorage.getItem('token') || '')
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function login(email: string, password: string) {
    loading.value = true
    error.value = ''
    try {
      const response = await authApi.login(email, password)
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', token.value)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, password: string, name: string) {
    loading.value = true
    error.value = ''
    try {
      const response = await authApi.register(email, password, name)
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', token.value)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const response = await authApi.me()
      user.value = response.data
    } catch {
      logout()
    }
  }

  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    fetchUser,
    logout,
  }
})
