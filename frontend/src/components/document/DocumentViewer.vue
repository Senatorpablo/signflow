<template>
  <div class="relative">
    <!-- Toolbar -->
    <div class="flex items-center justify-between bg-white border-b border-gray-200 p-3 sticky top-0 z-10">
      <div class="flex items-center gap-2">
        <button
          v-for="action in zoomActions"
          :key="action.id"
          @click="action.handler"
          class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          :title="action.label"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="action.icon === 'zoom-out'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            <path v-else-if="action.icon === 'zoom-in'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <span class="text-sm text-gray-600 min-w-[60px] text-center">{{ Math.round(zoom * 100) }}%</span>
      </div>

      <div class="flex items-center gap-2">
        <button @click="prevPage" :disabled="currentPage <= 1" class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span class="text-sm text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage >= totalPages" class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- PDF Pages -->
    <div ref="containerRef" class="overflow-auto p-8">
      <div
        v-for="page in pages"
        :key="page.pageNumber"
        class="relative mx-auto mb-8 shadow-lg bg-white"
        :style="{ width: page.viewport.width + 'px', height: page.viewport.height + 'px' }"
      >
        <canvas
          :ref="(el) => setCanvasRef(el, page.pageNumber)"
          class="absolute inset-0"
        />

        <!-- Field Overlays -->
        <template v-if="mode === 'edit'">
          <div
            v-for="field in pageFields(page.pageNumber)"
            :key="field.id"
            class="absolute border-2 cursor-move hover:border-primary-500 transition-colors"
            :class="[
              selectedFieldId === field.id ? 'border-primary-500 bg-primary-50/30' : 'border-gray-400 bg-gray-100/50',
              field.type === 'SIGNATURE' ? 'border-dashed' : ''
            ]"
            :style="{
              left: field.x * zoom + 'px',
              top: field.y * zoom + 'px',
              width: field.width * zoom + 'px',
              height: field.height * zoom + 'px',
            }"
            @click="$emit('field-click', field)"
            @mousedown="startDrag(field, $event)"
          >
            <span class="text-xs text-gray-600 bg-white/90 px-1 rounded">{{ field.label || field.type }}</span>
          </div>
        </template>

        <template v-if="mode === 'sign'">
          <div
            v-for="field in pageFields(page.pageNumber)"
            :key="field.id"
            class="absolute border-2 cursor-pointer hover:border-primary-500 transition-colors"
            :class="[
              field.value ? 'border-success-500 bg-success-50/30' : 'border-primary-400 bg-primary-50/30',
            ]"
            :style="{
              left: field.x * zoom + 'px',
              top: field.y * zoom + 'px',
              width: field.width * zoom + 'px',
              height: field.height * zoom + 'px',
            }"
            @click="$emit('field-click', field)"
          >
            <div v-if="field.value" class="w-full h-full flex items-center justify-center">
              <img v-if="isImageField(field)" :src="field.value" class="max-w-full max-h-full" />
              <span v-else class="text-sm text-gray-900">{{ field.value }}</span>
            </div>
            <div v-else class="w-full h-full flex items-center justify-center">
              <span class="text-sm text-primary-600 font-medium">{{ field.type === 'SIGNATURE' ? 'Click to sign' : 'Click to fill' }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { usePdfRender } from '@/composables/usePdfRender'
import type { Field } from '@/types'

interface Props {
  documentUrl: string
  fields?: Field[]
  mode?: 'view' | 'edit' | 'sign'
}

const props = withDefaults(defineProps<Props>(), {
  fields: () => [],
  mode: 'view',
})

const emit = defineEmits<{
  (e: 'field-click', field: Field): void
}>()

const {
  pdfDocument,
  pages,
  currentPage,
  totalPages,
  zoom,
  loading,
  error,
  loadDocument,
  renderPage,
  zoomIn,
  zoomOut,
  nextPage,
  prevPage,
} = usePdfRender()

const containerRef = ref<HTMLElement | null>(null)
const canvasRefs = ref<Map<number, HTMLCanvasElement>>(new Map())
const selectedFieldId = ref('')

const zoomActions = [
  { id: 'out', label: 'Zoom Out', icon: 'zoom-out', handler: zoomOut },
  { id: 'fit', label: 'Fit to Width', icon: 'fit', handler: () => fitToWidth() },
  { id: 'in', label: 'Zoom In', icon: 'zoom-in', handler: zoomIn },
]

function setCanvasRef(el: any, pageNumber: number) {
  if (el) {
    canvasRefs.value.set(pageNumber, el)
  }
}

function pageFields(pageNumber: number) {
  return props.fields.filter(f => f.page === pageNumber)
}

function isImageField(field: Field) {
  return field.type === 'SIGNATURE' || field.type === 'INITIALS' || field.type === 'STAMP'
}

function startDrag(field: Field, event: MouseEvent) {
  // Drag implementation
}

function fitToWidth() {
  if (containerRef.value) {
    const containerWidth = containerRef.value.clientWidth - 64 // padding
    // Calculate zoom based on page width
  }
}

onMounted(() => {
  if (props.documentUrl) {
    loadDocument(props.documentUrl)
  }
})

onUnmounted(() => {
  canvasRefs.value.clear()
})
</script>