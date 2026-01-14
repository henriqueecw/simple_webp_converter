export interface ConversionSettings {
  quality: number      // 0-100
  resize: number       // 0-100 (percentage)
  lossless: boolean
}

export const DEFAULT_SETTINGS: ConversionSettings = {
  quality: 90,
  resize: 100,
  lossless: false
}

export async function convertToWebP(
  file: File,
  settings: ConversionSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      try {
        // Calculate new dimensions
        const scale = settings.resize / 100
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)
        
        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to WebP
        const quality = settings.lossless ? 1 : settings.quality / 100
        const mimeType = 'image/webp'
        
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to convert image'))
            }
          },
          mimeType,
          quality
        )
      } catch (error) {
        URL.revokeObjectURL(url)
        reject(error)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}

export async function estimateSize(
  file: File,
  settings: ConversionSettings
): Promise<number> {
  const blob = await convertToWebP(file, settings)
  return blob.size
}

export function getWebPFileName(originalName: string): string {
  return originalName.replace(/\.[^/.]+$/, '.webp')
}
