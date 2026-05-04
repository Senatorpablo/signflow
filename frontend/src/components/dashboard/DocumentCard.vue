<template>
  <div class="card p-6 hover:shadow-md transition-shadow">
    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 class="font-medium text-gray-900 truncate max-w-[200px]">{{ document.title }}</h3>
          <p class="text-xs text-gray-500">{{ formatDate(document.createdAt) }}</p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <span
          :class="[
            'px-2.5 py-0.5 rounded-full text-xs font-medium',
            statusClasses[document.status]
          ]"
        >
          {{ formatStatus(document.status) }}
        </span>
      </div>
    </div>

    <!-- Recipients -->
    <div v-if="document.recipients && document.recipients.length > 0" class="mb-4">
      <div class="flex items-center gap-2">
        <div class="flex -space-x-2">
          <div
            v-for="(recipient, i) in document.recipients.slice(0, 3)"
            :key="i"
            class="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
          >
            {{ recipient.name?.charAt(0).toUpperCase() || recipient.email.charAt(0).toUpperCase() }}
          </div>
        </div>
        <span class="text-sm text-gray-500">
          {{ document.recipients.length }} signer{{ document.recipients.length > 1 ? 's' : '' }}
        </span>
      </div>
    </div>

    <!-- Progress bar for sent documents -->
    <div v-if="document.status === 'SENT' || document.status === 'PARTIALLY_SIGNED'" class="mb-4">
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-primary-600 h-2 rounded-full transition-all"
          :style="{ width: signatureProgress + '%' }"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">{{ signedCount }}/{{ document.recipients.length }} signed</p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 pt-4 border-t border-gray-100">
      <router-link
        :to="`/dashboard/documents/${document.id}`"
        class="flex-1 text-center py-2 text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 rounded-lg"
      >
        View
      </router-link>
      
      <button
        v-if="document.status === 'DRAFT'"
        @click="$emit('send', document)"
        class="flex-1 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
      >
        Send
      </button>
      
      <button
        v-if="document.status === 'COMPLETED'"
        @click="downloadDocument"
        class="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
      >
        Download
      </button>

      <button
        @click="$emit('delete', document.id)"
        class="p-2 text-gray-400 hover:text-danger-600"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Document } from '@/types'

interface Props {
  document: Document
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'delete', id: string): void
  (e: 'send', document: Document): void
}>()

const statusClasses: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-primary-100 text-primary-700',
  PARTIALLY_SIGNED: 'bg-warning-100 text-warning-600',
  COMPLETED: 'bg-success-100 text-success-600',
  VOIDED: 'bg-danger-100 text-danger-600',
  EXPIRED: 'bg-gray-100 text-gray-500',
  DECLINED: 'bg-danger-100 text-danger-600',
}

const signedCount = computed(() => {
  return props.document.signatures?.length || 0
})

const signatureProgress = computed(() => {
  if (!props.document.recipients?.length) return 0
  return Math.round((signedCount.value / props.document.recipients.length) * 100)
})

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    PARTIALLY_SIGNED: 'In Progress',
    COMPLETED: 'Completed',
    VOIDED: 'Voided',
    EXPIRED: 'Expired',
    DECLINED: 'Declined',
  }
  return statusMap[status] || status
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function downloadDocument() {
  // Implementation would call API and download
  console.log('Downloading document:', props.document.id)
}
</script>
