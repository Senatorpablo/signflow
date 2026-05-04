<template>
  <div class="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
    <h2 class="font-semibold text-gray-900 mb-4">Field Types</h2>

    <div class="space-y-2">
      <div
        v-for="fieldType in fieldTypes"
        :key="fieldType.id"
        draggable="true"
        class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-grab hover:border-primary-300 hover:bg-primary-50 transition-colors"
        @dragstart="$emit('drag-start', fieldType)"
      >
        <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="fieldType.color">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="fieldType.icon === 'signature'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            <path v-else-if="fieldType.icon === 'text'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
            <path v-else-if="fieldType.icon === 'check'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            <path v-else-if="fieldType.icon === 'calendar'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </div>
        <span class="text-sm font-medium text-gray-700">{{ fieldType.label }}</span>
      </div>
    </div>

    <div class="mt-auto pt-4 border-t border-gray-200">
      <p class="text-xs text-gray-500">Drag fields onto the document</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const fieldTypes = [
  { id: 'SIGNATURE', label: 'Signature', icon: 'signature', color: 'bg-blue-100 text-blue-600' },
  { id: 'INITIALS', label: 'Initials', icon: 'signature', color: 'bg-blue-100 text-blue-600' },
  { id: 'TEXT', label: 'Text Field', icon: 'text', color: 'bg-gray-100 text-gray-600' },
  { id: 'DATE', label: 'Date', icon: 'calendar', color: 'bg-green-100 text-green-600' },
  { id: 'CHECKBOX', label: 'Checkbox', icon: 'check', color: 'bg-purple-100 text-purple-600' },
  { id: 'NAME', label: 'Full Name', icon: 'text', color: 'bg-gray-100 text-gray-600' },
  { id: 'EMAIL', label: 'Email', icon: 'text', color: 'bg-gray-100 text-gray-600' },
  { id: 'COMPANY', label: 'Company', icon: 'text', color: 'bg-gray-100 text-gray-600' },
  { id: 'TITLE', label: 'Title', icon: 'text', color: 'bg-gray-100 text-gray-600' },
]

defineEmits<{
  (e: 'drag-start', fieldType: typeof fieldTypes[0]): void
}>()
</script>