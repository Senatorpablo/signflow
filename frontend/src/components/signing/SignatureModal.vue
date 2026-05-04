<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Add Signature</h2>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-200">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex-1 py-3 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Draw -->
        <div v-if="activeTab === 'draw'" class="space-y-4">
          <div class="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
            <canvas
              ref="canvasRef"
              class="w-full h-48 cursor-crosshair touch-none"
              @touchstart.prevent=""
            />
          </div>
          <p class="text-sm text-gray-500 text-center">Draw your signature above</p>
        </div>

        <!-- Type -->
        <div v-if="activeTab === 'type'" class="space-y-4">
          <input
            v-model="typedSignature"
            type="text"
            class="input text-center text-2xl py-4"
            placeholder="Type your name"
            style="font-family: 'Cursive', cursive"
          />
          <div v-if="typedSignature" class="border-2 border-gray-300 rounded-lg p-6 text-center">
            <p class="text-3xl text-gray-900" style="font-family: 'Brush Script MT', cursive">
              {{ typedSignature }}
            </p>
          </div>
        </div>

        <!-- Upload -->
        <div v-if="activeTab === 'upload'" class="space-y-4">
          <div
            class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
            @click="uploadInput?.click()"
          >
            <svg class="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="text-sm text-gray-500">Click to upload signature image</p>
          </div>
          <input ref="uploadInput" type="file" accept="image/*" class="hidden" @change="handleUpload" />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between p-6 border-t border-gray-200">
        <button @click="clear" class="btn-secondary text-sm">
          Clear
        </button>
        <div class="flex gap-3">
          <button @click="$emit('close')" class="btn-secondary text-sm">
            Cancel
          </button>
          <button
            @click="saveSignature"
            :disabled="!hasSignature"
            class="btn-primary text-sm disabled:opacity-50"
          >
            Adopt Signature
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SignaturePad from 'signature_pad'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'signed', data: string): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const uploadInput = ref<HTMLInputElement | null>(null)
const activeTab = ref('draw')
const typedSignature = ref('')
const uploadedImage = ref('')
const signaturePad = ref<SignaturePad | null>(null)

const tabs = [
  { id: 'draw', label: 'Draw' },
  { id: 'type', label: 'Type' },
  { id: 'upload', label: 'Upload' },
]

const hasSignature = computed(() => {
  if (activeTab.value === 'draw') {
    return signaturePad.value && !signaturePad.value.isEmpty()
  }
  if (activeTab.value === 'type') {
    return typedSignature.value.trim().length > 0
  }
  if (activeTab.value === 'upload') {
    return uploadedImage.value.length > 0
  }
  return false
})

onMounted(() => {
  if (canvasRef.value) {
    signaturePad.value = new SignaturePad(canvasRef.value, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: '#000000',
      minWidth: 1,
      maxWidth: 3,
    })
  }
})

onUnmounted(() => {
  if (signaturePad.value) {
    signaturePad.value.off()
  }
})

function clear() {
  if (activeTab.value === 'draw') {
    signaturePad.value?.clear()
  } else if (activeTab.value === 'type') {
    typedSignature.value = ''
  } else if (activeTab.value === 'upload') {
    uploadedImage.value = ''
  }
}

function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) {
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedImage.value = e.target?.result as string
    }
    reader.readAsDataURL(input.files[0])
  }
}

function saveSignature() {
  let signatureData = ''

  if (activeTab.value === 'draw' && signaturePad.value) {
    signatureData = signaturePad.value.toDataURL('image/png')
  } else if (activeTab.value === 'type') {
    // Convert typed text to image using canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      canvas.width = 400
      canvas.height = 100
      ctx.font = '30px "Brush Script MT", cursive'
      ctx.fillStyle = '#000000'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedSignature.value, canvas.width / 2, canvas.height / 2)
      signatureData = canvas.toDataURL('image/png')
    }
  } else if (activeTab.value === 'upload') {
    signatureData = uploadedImage.value
  }

  emit('signed', signatureData)
}
</script>