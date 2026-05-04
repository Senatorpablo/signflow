import apiClient from './apiClient'

export const signingApi = {
  getDocument(token: string) {
    return apiClient.get(`/signatures/sign/${token}`)
  },

  submitSignature(token: string, data: {
    fieldId: string
    signatureData: string
    type: string
  }) {
    return apiClient.post(`/signatures/sign/${token}`, data)
  },

  completeSigning(token: string) {
    return apiClient.post(`/signatures/complete/${token}`)
  },

  decline(token: string, reason?: string) {
    return apiClient.post(`/signatures/decline/${token}`, { reason })
  },
}
