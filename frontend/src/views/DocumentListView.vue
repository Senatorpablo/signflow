<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Documents</h1>
        <p class="text-gray-500 mt-1">Manage and track your documents</p>
      </div>
      <router-link to="/dashboard/upload" class="btn-primary">
        <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Upload Document
      </router-link>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-6">
      <button
        v-for="filter in filters"
        :key="filter.value"
        @click="activeFilter = filter.value"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          activeFilter === filter.value
            ? 'bg-primary-100 text-primary-700'
            : 'bg-white text-gray-600 hover:bg-gray-100'
        ]"
      >
        {{ filter.label }}
        <span
          v-if="filter.count > 0"
          :class="[
            'ml-2 px-2 py-0.5 rounded-full text-xs',
            activeFilter === filter.value
              ? 'bg-primary-200 text-primary-800'
              : 'bg-gray-100 text-gray-600'
          ]"
        >
          {{ filter.count }}
        </span>
      </button>
    </div>

    <!-- Document Grid -->
    <div v-if="!loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DocumentCard
        v-for="doc in filteredDocuments"
        :key="doc.id"
        :document="doc"
        @delete="deleteDocument"
        @send="sendDocument"
      />
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && documents.length === 0" class="text-center py-12">
      <div class="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
      <p class="text-gray-500 mb-4">Upload your first document to get started</p>
      <router-link to="/dashboard/upload" class="btn-primary">
        Upload Document
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import DocumentCard from '@/components/dashboard/DocumentCard.vue'
import type { Document } from '@/types'

const documentStore = useDocumentStore()
const activeFilter = ref('all')

const filters = [
  { label: 'All', value: 'all', count: 0 },
  { label: 'Draft', value: 'DRAFT', count: 0 },
  { label: 'Sent', value: 'SENT', count: 0 },
  { label: 'Completed', value: 'COMPLETED', count: 0 },
]

const loading = computed(() => documentStore.loading)
const documents = computed(() => documentStore.documents)

const filteredDocuments = computed(() => {
  if (activeFilter.value === 'all') return documents.value
  return documents.value.filter(d => d.status === activeFilter.value)
})

onMounted(() => {
  documentStore.fetchDocuments()
})

function deleteDocument(id: string) {
  if (confirm('Are you sure you want to delete this document?')) {
    documentStore.deleteDocument(id)
  }
}

function sendDocument(doc: Document) {
  // Navigate to document detail for sending
  // This would open a modal or navigate to a send page
}
</script>