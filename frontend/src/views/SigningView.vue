<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 class="font-medium text-gray-900">{{ document?.title || 'Sign Document' }}</h1>
            <p class="text-sm text-gray-500">{{ completedFields }}/{{ totalFields }} fields completed</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            v-if="canComplete"
            @click="completeSigning"
            :disabled="submitting"
            class="btn-primary"
          >
            {{ submitting ? 'Submitting...' : 'Complete Signing' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Document Viewer -->
    <div class="flex">
      <!-- PDF Viewer -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
        </div>

        <div v-else-if="document" class="p-6">
          <DocumentViewer
            :document-url="documentUrl"
            :fields="fields"
            :mode="'sign'"
            @field-click="handleFieldClick"
          />
        </div>
      </div>

      <!-- Field Panel -->
      <div class="w-80 bg-white border-l border-gray-200 p-6">
        <h2 class="font-medium text-gray-900 mb-4">Fields to Complete</h2>

        <div class="space-y-3">
          <div
            v-for="field in fields"
            :key="field.id"
            :class="[
              'p-3 rounded-lg border cursor-pointer transition-colors',
              field.value ? 'bg-success-50 border-success-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            ]"
            @click="scrollToField(field)"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">{{ field.label || field.type }}</span>
              <span
                v-if="field.value"
                class="text-xs text-success-600 font-medium"
              >✓ Done</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">{{ field.required ? 'Required' : 'Optional' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Signature Modal -->
    <SignatureModal
      v-if="showSignatureModal"
      @close="showSignatureModal = false"
      @signed="handleSignature"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { signingApi } from '@/services/signingApi'
import DocumentViewer from '@/components/document/DocumentViewer.vue'
import SignatureModal from '@/components/signing/SignatureModal.vue'
import type { Document, Field } from '@/types'

const route = useRoute()
const token = route.params.token as string

const document = ref<Document | null>(null)
const fields = ref<Field[]>([])
const loading = ref(true)
const submitting = ref(false)
const showSignatureModal = ref(false)
const activeFieldId = ref('')

const documentUrl = ref('')

const completedFields = computed(() => fields.value.filter(f => f.value).length)
const totalFields = computed(() => fields.value.length)
const canComplete = computed(() => {
  const requiredFields = fields.value.filter(f => f.required)
  return requiredFields.every(f => f.value)
})

onMounted(async () => {
  try {
    const response = await signingApi.getDocument(token)
    document.value = response.data.document
    fields.value = response.data.fields
    documentUrl.value = response.data.documentUrl
  } catch (error) {
    console.error('Failed to load document:', error)
  } finally {
    loading.value = false
  }
})

function handleFieldClick(field: Field) {
  if (field.type === 'SIGNATURE' || field.type === 'INITIALS') {
    activeFieldId.value = field.id
    showSignatureModal.value = true
  } else {
    // Handle text input, checkbox, etc.
    activeFieldId.value = field.id
  }
}

function handleSignature(signatureData: string) {
  const field = fields.value.find(f => f.id === activeFieldId.value)
  if (field) {
    field.value = signatureData
  }
  showSignatureModal.value = false
}

function scrollToField(field: Field) {
  // Scroll to field position in viewer
}

async function completeSigning() {
  submitting.value = true
  try {
    // Submit all field values
    for (const field of fields.value) {
      if (field.value) {
        await signingApi.submitSignature(token, {
          fieldId: field.id,
          signatureData: field.value,
          type: field.type === 'SIGNATURE' ? 'DRAWN' : 'TEXT',
        })
      }
    }

    await signingApi.completeSigning(token)
    // Show success message, redirect to completion page
  } catch (error) {
    console.error('Signing failed:', error)
  } finally {
    submitting.value = false
  }
}
</script>