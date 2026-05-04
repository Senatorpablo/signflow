<template>
  <div class="flex h-screen">
    <!-- Field Palette -->
    <FieldPalette @drag-start="handleDragStart" />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Toolbar -->
      <div class="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex items-center gap-4">
          <input
            v-model="templateName"
            type="text"
            class="text-lg font-semibold border-none focus:ring-0 p-0"
            placeholder="Template Name"
          />
        </div>

        <div class="flex items-center gap-3">
          <button @click="undo" class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Undo">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button @click="redo" class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Redo">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <button @click="saveTemplate" class="btn-primary">
            Save Template
          </button>
        </div>
      </div>

      <!-- Document Viewer with Fields -->
      <div class="flex-1 overflow-auto bg-gray-100">
        <DocumentViewer
          :document-url="documentUrl"
          :fields="fields"
          mode="edit"
          @field-click="handleFieldClick"
        />
      </div>
    </div>

    <!-- Field Properties Panel -->
    <div v-if="selectedField" class="w-80 bg-white border-l border-gray-200 p-6">
      <h3 class="font-semibold text-gray-900 mb-4">Field Properties</h3>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input v-model="selectedField.label" type="text" class="input" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
          <input v-model="selectedField.placeholder" type="text" class="input" />
        </div>

        <div class="flex items-center gap-2">
          <input v-model="selectedField.required" type="checkbox" id="required" class="rounded" />
          <label for="required" class="text-sm text-gray-700">Required field</label>
        </div>

        <div class="flex gap-3">
          <button @click="deleteField" class="flex-1 btn-danger">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFieldStore } from '@/stores/fieldStore'
import FieldPalette from '@/components/document/FieldPalette.vue'
import DocumentViewer from '@/components/document/DocumentViewer.vue'

const fieldStore = useFieldStore()

const templateName = ref('New Template')
const documentUrl = ref('') // Would be loaded from uploaded PDF

const fields = computed(() => fieldStore.fields)
const selectedField = computed(() => fieldStore.selectedField)

function handleDragStart(fieldType: any) {
  // Set drag data for field creation
}

function handleFieldClick(field: any) {
  fieldStore.selectField(field.id)
}

function deleteField() {
  if (selectedField.value) {
    fieldStore.removeField(selectedField.value.id)
  }
}

function undo() {
  fieldStore.undo()
}

function redo() {
  fieldStore.redo()
}

function saveTemplate() {
  // Save template to backend
  console.log('Saving template:', {
    name: templateName.value,
    fields: fields.value,
  })
}
</script>