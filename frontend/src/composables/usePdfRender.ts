import { ref, onMounted, onUnmounted } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js'

export interface PDFPage {
  pageNumber: number
  viewport: pdfjsLib.PageViewport
  renderTask: pdfjsLib.RenderTask | null
}

export function usePdfRender() {
  const pdfDocument = ref<pdfjsLib.PDFDocumentProxy | null>(null)
  const pages = ref<PDFPage[]>([])
  const currentPage = ref(1)
  const totalPages = ref(0)
  const zoom = ref(1)
  const loading = ref(false)
  const error = ref('')

  async function loadDocument(url: string) {
    loading.value = true
    error.value = ''
    
    try {
      const loadingTask = pdfjsLib.getDocument(url)
      pdfDocument.value = await loadingTask.promise
      totalPages.value = pdfDocument.value.numPages
      
      // Initialize page array
      pages.value = []
      for (let i = 1; i <= totalPages.value; i++) {
        const page = await pdfDocument.value.getPage(i)
        pages.value.push({
          pageNumber: i,
          viewport: page.getViewport({ scale: zoom.value }),
          renderTask: null,
        })
      }
    } catch (err) {
      error.value = 'Failed to load PDF document'
      console.error('PDF load error:', err)
    } finally {
      loading.value = false
    }
  }

  async function renderPage(canvas: HTMLCanvasElement, pageNumber: number) {
    if (!pdfDocument.value) return

    try {
      const page = await pdfDocument.value.getPage(pageNumber)
      const viewport = page.getViewport({ scale: zoom.value })
      
      canvas.width = viewport.width
      canvas.height = viewport.height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
      })

      await renderTask.promise
    } catch (err) {
      console.error('Page render error:', err)
    }
  }

  function setZoom(newZoom: number) {
    zoom.value = Math.max(0.25, Math.min(3, newZoom))
    // Re-render all pages with new zoom
    pages.value = pages.value.map(p => ({
      ...p,
      viewport: p.viewport.clone({ scale: zoom.value }),
    }))
  }

  function zoomIn() {
    setZoom(zoom.value + 0.25)
  }

  function zoomOut() {
    setZoom(zoom.value - 0.25)
  }

  function fitWidth(containerWidth: number) {
    if (!pdfDocument.value || pages.value.length === 0) return
    const firstPage = pages.value[0]
    const newZoom = containerWidth / firstPage.viewport.width
    setZoom(newZoom)
  }

  function fitPage(containerHeight: number) {
    if (!pdfDocument.value || pages.value.length === 0) return
    const firstPage = pages.value[0]
    const newZoom = containerHeight / firstPage.viewport.height
    setZoom(newZoom)
  }

  function goToPage(page: number) {
    currentPage.value = Math.max(1, Math.min(totalPages.value, page))
  }

  function nextPage() {
    goToPage(currentPage.value + 1)
  }

  function prevPage() {
    goToPage(currentPage.value - 1)
  }

  onUnmounted(() => {
    if (pdfDocument.value) {
      pdfDocument.value.destroy()
    }
  })

  return {
    pdfDocument,
    pages,
    currentPage,
    totalPages,
    zoom,
    loading,
    error,
    loadDocument,
    renderPage,
    setZoom,
    zoomIn,
    zoomOut,
    fitWidth,
    fitPage,
    goToPage,
    nextPage,
    prevPage,
  }
}
