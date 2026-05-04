<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <router-link to="/dashboard/documents" class="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">← Back to Documents</router-link>
        <h1 class="text-2xl font-bold text-gray-900">{{ document?.title || 'Document' }}</h1>
      </div>
      <div class="flex items-center gap-3">
        <button v-if="document?.status === 'DRAFT'" @click="showSendModal = true" class="btn-primary">Send for Signing</button>
        <button v-if="document?.status === 'COMPLETED'" @click="downloadDocument" class="btn-secondary">Download</button>
      </div>
    </div>

    <!-- Status Badge -->
    <div class="mb-6">
      <span class="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-700">
        {{ document?.status }}
      </span>
    </div>

    <!-- Document Viewer -->
    <div class="card p-6">
      <DocumentViewer
        :document-url="documentUrl"
        :fields="document?.fields || []"
        mode="view"
      />
    </div>
  </div>

  <!-- Send Modal -->
  <div v-if="showSendModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Send for Signing</h2>
      
      <div class="space-y-4">
        <div v-for="(signer, index) in signers" :key="index" class="flex gap-3">
          <input v-model="signer.name" type="text" class="input flex-1" placeholder="Signer Name" />
          <input v-model="signer.email" type="email" class="input flex-1" placeholder="Signer Email" />
          <button @click="removeSigner(index)" class="text-gray-400 hover:text-danger-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <button @click="addSigner" class="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Add another signer</button>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
          <textarea v-model="message" class="input" rows="3" placeholder="Add a message for signers..."></textarea>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button @click="showSendModal = false" class="flex-1 btn-secondary">Cancel</button>
        <button @click="sendDocument" class="flex-1 btn-primary">Send</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDocumentStore } from '@/stores/documentStore'
import DocumentViewer from '@/components/document/DocumentViewer.vue'
import type { Signer } from '@/types'

const route = useRoute()
const documentStore = useDocumentStore()

const document = ref(documentStore.currentDocument)
const documentUrl = ref('')
const showSendModal = ref(false)
const signers = ref<Signer[]>([{ email: '', name: '' }])
const message = ref('')

onMounted(async () => {
  const id = route.params.id as string
  await documentStore.fetchDocument(id)
  document.value = documentStore.currentDocument
})

function addSigner() {
  signers.value.push({ email: '', name: '' })
}

function removeSigner(index: number) {
  signers.value.splice(index, 1)
}

async function sendDocument() {
  if (!document.value) return
  const validSigners = signers.value.filter(s => s.email && s.name)
  await documentStore.sendDocument(document.value.id, validSigners, message.value)
  showSendModal.value = false
}

function downloadDocument() {
  if (!document.value) return
  documentStore.download(document.value.id)
}
</script>