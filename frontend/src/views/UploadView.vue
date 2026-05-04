<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Upload Document</h1>

    <div class="max-w-2xl">
      <!-- Upload Area -->
      <div
        @dragover.prevent="dragover = true"
        @dragleave.prevent="dragover = false"
        @drop.prevent="handleDrop"
        :class="[
          'border-2 border-dashed rounded-xl p-12 text-center transition-colors',
          dragover ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50'
        ]"
      >
        <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <p class="text-lg font-medium text-gray-900 mb-2">
          Drop your PDF here, or <button @click="fileInput?.click()" class="text-primary-600 hover:text-primary-700 font-medium">browse</button>
        </p>
        <p class="text-sm text-gray-500">Supports PDF files up to 25MB</p>

        <input
          ref="fileInput"
          type="file"
          accept=".pdf"
          class="hidden"
          @change="handleFileSelect"
        />
      </div>

      <!-- Selected File -->
      <div v-if="selectedFile" class="mt-6 card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-medium text-gray-900">{{ selectedFile.name }}</p>
            <p class="text-sm text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <button @click="selectedFile = null" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
          <input
            v-model="title"
            type="text"
            class="input"
            placeholder="Enter document title"
            :value="selectedFile.name.replace('.pdf', '')"
          />
        </div>

        <div class="mt-4 flex gap-3">
          <button
            @click="uploadDocument"
            :disabled="uploading"
            class="flex-1 btn-primary py-2.5"
          >
            <span v-if="uploading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </span>
            <span v-else>Upload Document</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/documentStore'

const router = useRouter()
const documentStore = useDocumentStore()

const fileInput = ref<HTMLInputElement | null>(null)
const dragover = ref(false)
const selectedFile = ref<File | null>(null)
const title = ref('')
const uploading = ref(false)

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    selectedFile.value = input.files[0]
    title.value = selectedFile.value.name.replace('.pdf', '')
  }
}

function handleDrop(event: DragEvent) {
  dragover.value = false
  const files = event.dataTransfer?.files
  if (files?.length) {
    const file = files[0]
    if (file.type === 'application/pdf') {
      selectedFile.value = file
      title.value = file.name.replace('.pdf', '')
    }
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function uploadDocument() {
  if (!selectedFile.value) return

  uploading.value = true
  try {
    const doc = await documentStore.createDocument(selectedFile.value, title.value)
    router.push(`/dashboard/documents/${doc.id}`)
  } catch (error) {
    console.error('Upload failed:', error)
  } finally {
    uploading.value = false
  }
}
</script>