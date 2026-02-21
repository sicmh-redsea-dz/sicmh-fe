export type ImageCompressionOptions = {
  maxDimension?: number
  quality?: number
  mimeType?: string
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })

const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'))
    img.src = dataUrl
  })

export const compressImage = async (
  file: File,
  options: ImageCompressionOptions = {}
): Promise<{ dataUrl: string; contentType: string; size: number }> => {
  const maxDimension = options.maxDimension ?? 1024
  const quality = options.quality ?? 0.8
  const mimeType = options.mimeType ?? 'image/jpeg'

  const originalDataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(originalDataUrl)

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  const targetWidth = Math.max(1, Math.round(img.width * scale))
  const targetHeight = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No se pudo procesar la imagen.')
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
  const dataUrl = canvas.toDataURL(mimeType, quality)
  const base64 = dataUrl.split(',')[1] ?? ''
  const size = Math.ceil((base64.length * 3) / 4)

  return { dataUrl, contentType: mimeType, size }
}
