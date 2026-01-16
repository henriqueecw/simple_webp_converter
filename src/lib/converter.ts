export type QualityPreset = 'custom' | 'photo' | 'web' | 'crisp' | 'webflowLike'
export type ResizeMode = 'percentage' | 'width' | 'height' | 'exact'

export interface ResizeSettings {
  mode: ResizeMode
  percentage: number   // 0-100 (used when mode is 'percentage')
  width: number        // target width in pixels (used when mode is 'width' or 'exact')
  height: number       // target height in pixels (used when mode is 'height' or 'exact')
}

export interface ConversionSettings {
  quality: number      // 0-100
  resize: ResizeSettings
  lossless: boolean
  sharpen: number      // 0-100 (sharpening strength)
  denoise: number      // 0-100 (noise reduction before compression)
  preset: QualityPreset
}

export const DEFAULT_RESIZE: ResizeSettings = {
  mode: 'percentage',
  percentage: 100,
  width: 1920,
  height: 1080
}

export const DEFAULT_SETTINGS: ConversionSettings = {
  quality: 90,
  resize: { ...DEFAULT_RESIZE },
  lossless: false,
  sharpen: 0,
  denoise: 0,
  preset: 'custom'
}

export const PRESETS: Record<QualityPreset, Partial<ConversionSettings>> = {
  custom: {},
  photo: {
    quality: 88,
    sharpen: 20,
    denoise: 15,
    lossless: false
  },
  web: {
    quality: 85,
    sharpen: 30,
    denoise: 20,
    lossless: false
  },
  crisp: {
    quality: 92,
    sharpen: 35,
    denoise: 10,
    lossless: false
  },
  webflowLike: {
    quality: 90,
    sharpen: 25,
    denoise: 25,
    lossless: false
  }
}

// BT.601 coefficients for RGB <-> YCbCr conversion
const KR = 0.299
const KG = 0.587
const KB = 0.114

/**
 * Extracts luminance channel from RGB data
 * Colors are preserved by only modifying luminance later
 */
function extractLuminance(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const luminance = new Float32Array(width * height)
  
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    // BT.601 luminance
    luminance[i] = KR * data[idx] + KG * data[idx + 1] + KB * data[idx + 2]
  }
  
  return luminance
}

/**
 * Applies luminance changes back to RGB while preserving original colors
 * This ensures NO color shift - only brightness/contrast changes
 */
function applyLuminanceToRGB(
  data: Uint8ClampedArray, 
  originalLuminance: Float32Array,
  newLuminance: Float32Array,
  width: number, 
  height: number
): void {
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    const oldLum = originalLuminance[i]
    const newLum = newLuminance[i]
    
    // Avoid division by zero
    if (oldLum < 0.001) {
      // For very dark pixels, just add the luminance difference
      const diff = newLum - oldLum
      data[idx] = Math.max(0, Math.min(255, Math.round(data[idx] + diff)))
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(data[idx + 1] + diff)))
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(data[idx + 2] + diff)))
    } else {
      // Scale RGB proportionally to maintain exact color ratios
      const scale = newLum / oldLum
      data[idx] = Math.max(0, Math.min(255, Math.round(data[idx] * scale)))
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(data[idx + 1] * scale)))
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(data[idx + 2] * scale)))
    }
    // Alpha channel (idx + 3) is never touched
  }
}

/**
 * Applies denoise to luminance channel only
 * Bilateral filter that preserves edges while smoothing noise
 * Colors remain completely unchanged
 */
function denoiseLuminance(
  luminance: Float32Array, 
  width: number, 
  height: number, 
  strength: number
): Float32Array {
  if (strength <= 0) return luminance
  
  const result = new Float32Array(luminance)
  
  // Bilateral filter parameters
  const sigma = (strength / 100) * 25 + 5 // Range sigma: 5-30
  const spatialSigma = 1.2
  const radius = Math.ceil(strength / 25) // 1-2 pixel radius
  
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const i = y * width + x
      const centerValue = luminance[i]
      
      let sum = 0
      let weightSum = 0
      
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const ni = (y + ky) * width + (x + kx)
          const neighborValue = luminance[ni]
          
          // Spatial weight
          const spatialDist = Math.sqrt(kx * kx + ky * ky)
          const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * spatialSigma * spatialSigma))
          
          // Range weight (preserves edges)
          const lumDiff = Math.abs(neighborValue - centerValue)
          const rangeWeight = Math.exp(-(lumDiff * lumDiff) / (2 * sigma * sigma))
          
          const weight = spatialWeight * rangeWeight
          sum += neighborValue * weight
          weightSum += weight
        }
      }
      
      result[i] = sum / weightSum
    }
  }
  
  return result
}

/**
 * Applies unsharp mask to luminance channel only
 * With threshold to avoid sharpening noise/flat areas
 * Colors remain completely unchanged
 */
function sharpenLuminance(
  luminance: Float32Array,
  width: number,
  height: number,
  amount: number
): Float32Array {
  if (amount <= 0) return luminance
  
  const result = new Float32Array(luminance)
  
  const strength = (amount / 100) * 0.7 // Max 70% to avoid halos
  const threshold = 3 + (60 - amount) * 0.15 // Adaptive threshold
  const radius = 1
  
  // Create blurred version
  const blurred = new Float32Array(luminance.length)
  
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const i = y * width + x
      let sum = 0
      let count = 0
      
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          sum += luminance[(y + ky) * width + (x + kx)]
          count++
        }
      }
      
      blurred[i] = sum / count
    }
  }
  
  // Apply unsharp mask with threshold
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const i = y * width + x
      const diff = luminance[i] - blurred[i]
      
      // Only sharpen if difference exceeds threshold (real edges)
      if (Math.abs(diff) > threshold) {
        // Smooth transition above threshold
        const edgeFactor = Math.min(1, (Math.abs(diff) - threshold) / 15)
        const sharpenAmount = diff * strength * edgeFactor
        result[i] = Math.max(0, Math.min(255, luminance[i] + sharpenAmount))
      }
    }
  }
  
  return result
}

/**
 * Browser-native resize - simulates CSS scaling behavior
 * 
 * This approach keeps the full resolution and lets Canvas drawImage
 * do the entire downscale in one step - exactly like when the browser
 * renders a large image in a small CSS container.
 * 
 * The browser's native algorithm (with imageSmoothingQuality: 'high')
 * has access to all original pixels and produces the smoothest results.
 */
function browserNativeResize(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const destCanvas = document.createElement('canvas')
  destCanvas.width = targetWidth
  destCanvas.height = targetHeight
  
  const ctx = destCanvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  
  // Single-step resize from full resolution to target
  // This is exactly what the browser does with CSS scaling
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
  
  return destCanvas
}

/**
 * Calculate target dimensions based on resize settings
 */
function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  resize: ResizeSettings
): { width: number; height: number } {
  switch (resize.mode) {
    case 'percentage': {
      const scale = resize.percentage / 100
      return {
        width: Math.round(originalWidth * scale),
        height: Math.round(originalHeight * scale)
      }
    }
    case 'width': {
      // Maintain aspect ratio based on width
      const scale = resize.width / originalWidth
      return {
        width: resize.width,
        height: Math.round(originalHeight * scale)
      }
    }
    case 'height': {
      // Maintain aspect ratio based on height
      const scale = resize.height / originalHeight
      return {
        width: Math.round(originalWidth * scale),
        height: resize.height
      }
    }
    case 'exact': {
      // Use exact dimensions (may break aspect ratio)
      return {
        width: resize.width,
        height: resize.height
      }
    }
    default:
      return { width: originalWidth, height: originalHeight }
  }
}

export async function convertToWebP(
  file: File,
  settings: ConversionSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = async () => {
      try {
        // Calculate new dimensions based on resize mode
        const { width, height } = calculateTargetDimensions(
          img.width,
          img.height,
          settings.resize
        )
        
        const needsResize = width !== img.width || height !== img.height
        let canvas: HTMLCanvasElement
        
        // Use browser-native resize (like CSS scaling)
        // This produces the smoothest, most natural results
        if (needsResize) {
          canvas = browserNativeResize(img, width, height)
        } else {
          // No resize needed - just draw to canvas
          canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)
        }
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        // Process only if denoise or sharpen is enabled
        if (settings.denoise > 0 || settings.sharpen > 0) {
          const imageData = ctx.getImageData(0, 0, width, height)
          const data = imageData.data
          
          // Extract luminance (preserves original color information)
          const originalLuminance = extractLuminance(data, width, height)
          let processedLuminance: Float32Array = Float32Array.from(originalLuminance)
          
          // Step 1: Denoise luminance only
          if (settings.denoise > 0) {
            processedLuminance = Float32Array.from(denoiseLuminance(processedLuminance, width, height, settings.denoise))
          }
          
          // Step 2: Sharpen luminance only
          if (settings.sharpen > 0) {
            processedLuminance = Float32Array.from(sharpenLuminance(processedLuminance, width, height, settings.sharpen))
          }
          
          // Apply luminance changes back to RGB (colors unchanged)
          applyLuminanceToRGB(data, originalLuminance, processedLuminance, width, height)
          
          ctx.putImageData(imageData, 0, 0)
        }
        
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

export function applyPreset(preset: QualityPreset, currentSettings: ConversionSettings): ConversionSettings {
  if (preset === 'custom') {
    return { ...currentSettings, preset }
  }
  
  // Apply preset but NEVER change resize settings
  // Resize is independent of quality presets
  const { resize } = currentSettings
  
  return {
    ...currentSettings,
    ...PRESETS[preset],
    resize, // Keep current resize settings
    preset
  }
}
