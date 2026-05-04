import apiClient from './apiClient'
import type { Signer, Field } from '@/types'

export const documentApi = {
  list(params?: { status?: string; page?: number; limit?: number }) {
    return apiClient.get('/documents', { params })
  },

  get(id: string) {
    return apiClient.get(`/documents/${id}`)
  },

  create(file: File, title: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    
    return apiClient.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  update(id: string, data: { title?: string; description?: string }) {
    return apiClient.patch(`/documents/${id}`, data)
  },

  delete(id: string) {
    return apiClient.delete(`/documents/${id}`)
  },

  send(id: string, signers: Signer[], message?: string) {
    return apiClient.post(`/documents/${id}/send`, { signers, message })
  },

  updateFields(id: string, fields: Field[]) {
    return apiClient.patch(`/documents/${id}/fields`, { fields })
  },

  void(id: string, reason?: string) {
    return apiClient.post(`/documents/${id}/void`, { reason })
  },

  download(id: string) {
    return apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    })
  },

  duplicate(id: string) {
    return apiClient.post(`/documents/${id}/duplicate`)
  },
}
