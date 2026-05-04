import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Field } from '@/types'

export const useFieldStore = defineStore('fields', () => {
  const fields = ref<Field[]>([])
  const selectedFieldId = ref<string | null>(null)
  const undoStack = ref<Field[][]>([])
  const redoStack = ref<Field[][]>([])

  const selectedField = computed(() => 
    fields.value.find(f => f.id === selectedFieldId.value) || null
  )

  const requiredFields = computed(() => 
    fields.value.filter(f => f.required)
  )

  const filledFields = computed(() => 
    fields.value.filter(f => f.value && f.value.trim() !== '')
  )

  function pushToUndo() {
    undoStack.value.push(JSON.parse(JSON.stringify(fields.value)))
    redoStack.value = []
  }

  function addField(field: Field) {
    pushToUndo()
    fields.value.push(field)
  }

  function updateField(id: string, updates: Partial<Field>) {
    pushToUndo()
    const index = fields.value.findIndex(f => f.id === id)
    if (index !== -1) {
      fields.value[index] = { ...fields.value[index], ...updates }
    }
  }

  function removeField(id: string) {
    pushToUndo()
    fields.value = fields.value.filter(f => f.id !== id)
    if (selectedFieldId.value === id) {
      selectedFieldId.value = null
    }
  }

  function moveField(id: string, x: number, y: number) {
    const index = fields.value.findIndex(f => f.id === id)
    if (index !== -1) {
      fields.value[index].x = x
      fields.value[index].y = y
    }
  }

  function resizeField(id: string, width: number, height: number) {
    const index = fields.value.findIndex(f => f.id === id)
    if (index !== -1) {
      fields.value[index].width = width
      fields.value[index].height = height
    }
  }

  function setFieldValue(id: string, value: string) {
    const index = fields.value.findIndex(f => f.id === id)
    if (index !== -1) {
      fields.value[index].value = value
    }
  }

  function undo() {
    if (undoStack.value.length > 0) {
      redoStack.value.push(JSON.parse(JSON.stringify(fields.value)))
      fields.value = undoStack.value.pop()!
    }
  }

  function redo() {
    if (redoStack.value.length > 0) {
      undoStack.value.push(JSON.parse(JSON.stringify(fields.value)))
      fields.value = redoStack.value.pop()!
    }
  }

  function selectField(id: string | null) {
    selectedFieldId.value = id
  }

  function clearFields() {
    pushToUndo()
    fields.value = []
    selectedFieldId.value = null
  }

  function loadFields(newFields: Field[]) {
    fields.value = newFields
    undoStack.value = []
    redoStack.value = []
  }

  return {
    fields,
    selectedFieldId,
    selectedField,
    requiredFields,
    filledFields,
    addField,
    updateField,
    removeField,
    moveField,
    resizeField,
    setFieldValue,
    undo,
    redo,
    selectField,
    clearFields,
    loadFields,
  }
})
