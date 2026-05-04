import apiClient from './apiClient'

export const authApi = {
  login(email: string, password: string) {
    return apiClient.post('/auth/login', { email, password })
  },

  register(email: string, password: string, name: string) {
    return apiClient.post('/auth/register', { email, password, name })
  },

  logout() {
    return apiClient.post('/auth/logout')
  },

  me() {
    return apiClient.get('/auth/me')
  },

  refreshToken(refreshToken: string) {
    return apiClient.post('/auth/refresh', { refreshToken })
  },

  forgotPassword(email: string) {
    return apiClient.post('/auth/forgot-password', { email })
  },

  resetPassword(token: string, password: string) {
    return apiClient.post('/auth/reset-password', { token, password })
  },

  updateProfile(data: { name?: string; avatar?: string }) {
    return apiClient.patch('/auth/profile', data)
  },

  changePassword(data: { currentPassword: string; newPassword: string }) {
    return apiClient.post('/auth/change-password', data)
  },
}
