import { ref, onMounted, onUnmounted } from 'vue'
import SignaturePad from 'signature_pad'

export function useSignaturePad(canvasRef: Ref<HTMLCanvasElement | null>) {
  const signaturePad = ref<SignaturePad | null>(null)
  const isEmpty = ref(true)

  onMounted(() => {
    if (!canvasRef.value) return

    signaturePad.value = new SignaturePad(canvasRef.value, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: '#000000',
      minWidth: 1,
      maxWidth: 3,
      throttle: 16,
    })

    signaturePad.value.addEventListener('endStroke', () => {
      isEmpty.value = signaturePad.value?.isEmpty() ?? true
    })
  })

  onUnmounted(() => {
    if (signaturePad.value) {
      signaturePad.value.off()
    }
  })

  function clear() {
    signaturePad.value?.clear()
    isEmpty.value = true
  }

  function toDataURL(format: 'png' | 'svg' = 'png'): string {
    if (!signaturePad.value) return ''
    
    if (format === 'svg') {
      return signaturePad.value.toSVG()
    }
    return signaturePad.value.toDataURL('image/png')
  }

  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!signaturePad.value) {
        resolve(null)
        return
      }
      
      const dataURL = signaturePad.value.toDataURL('image/png')
      fetch(dataURL)
        .then(res => res.blob())
        .then(blob => resolve(blob))
        .catch(() => resolve(null))
    })
  }

  function fromDataURL(dataURL: string) {
    signaturePad.value?.fromDataURL(dataURL)
    isEmpty.value = signaturePad.value?.isEmpty() ?? true
  }

  return {
    signaturePad,
    isEmpty,
    clear,
    toDataURL,
    toBlob,
    fromDataURL,
  }
}
