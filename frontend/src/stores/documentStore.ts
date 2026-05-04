import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { documentApi } from '@/services/documentApi'
import type { Document, Field, Signer } from '@/types'

export const useDocumentStore = defineStore('documents', () => {
  const documents = ref<Document[]>([])
  const currentDocument = ref<Document | null>(null)
  const loading = ref(false)
  const error = ref('')

  const sortedDocuments = computed(() => {
    return [...documents.value].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  })

  const documentsByStatus = computed(() => {
    return (status: string) => documents.value.filter(d => d.status === status)
  })

  async function fetchDocuments() {
    loading.value = true
    try {
      const response = await documentApi.list()
      documents.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to load documents'
    } finally {
      loading.value = false
    }
  }

  async function fetchDocument(id: string) {
    loading.value = true
    try {
      const response = await documentApi.get(id)
      currentDocument.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to load document'
    } finally {
      loading.value = false
    }
  }

  async function createDocument(file: File, title: string) {
    loading.value = true
    try {
      const response = await documentApi.create(file, title)
      documents.value.unshift(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create document'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function sendDocument(id: string, signers: Signer[], message?: string) {
    loading.value = true
    try {
      const response = await documentApi.send(id, signers, message)
      const index = documents.value.findIndex(d => d.id === id)
      if (index !== -1) {
        documents.value[index] = response.data
      }
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to send document'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateFields(id: string, fields: Field[]) {
    try {
      const response = await documentApi.updateFields(id, fields)
      if (currentDocument.value?.id === id) {
        currentDocument.value.fields = response.data.fields
      }
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update fields'
      throw err
    }
  }

  async function deleteDocument(id: string) {
    try {
      await documentApi.delete(id)
      documents.value = documents.value.filter(d => d.id !== id)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete document'
      throw err
    }
  }

  return {
    documents,
    currentDocument,
    loading,
    error,
    sortedDocuments,
    documentsByStatus,
    fetchDocuments,
    fetchDocument,
    createDocument,
    sendDocument,
    updateFields,
    deleteDocument,
  }
})
