export interface ImageFile {
  id: string
  file: File
  name: string
  baseName: string
  frameNumber: number | null
  originalSize: number
  convertedSize: number | null
  convertedBlob: Blob | null
  status: 'pending' | 'converting' | 'done' | 'error'
  error?: string
}

export interface ImageSequence {
  id: string
  baseName: string
  images: ImageFile[]
  isSequence: boolean
  missingFrames: number[]
  totalOriginalSize: number
  totalConvertedSize: number
}

// Pattern to extract frame number from filename
// Matches: name_0001.png, name0001.png, name_001.png, name001.png, etc.
const FRAME_PATTERNS = [
  /^(.+?)[-_]?(\d{2,})$/,  // name_0001 or name0001
  /^(.+?)[-_](\d+)$/,       // name-1 or name_1
]

function extractFrameInfo(filename: string): { baseName: string; frameNumber: number | null } {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  
  for (const pattern of FRAME_PATTERNS) {
    const match = nameWithoutExt.match(pattern)
    if (match) {
      return {
        baseName: match[1],
        frameNumber: parseInt(match[2], 10)
      }
    }
  }
  
  return {
    baseName: nameWithoutExt,
    frameNumber: null
  }
}

function findMissingFrames(frames: number[]): number[] {
  if (frames.length < 2) return []
  
  const sorted = [...frames].sort((a, b) => a - b)
  const missing: number[] = []
  
  for (let i = 1; i < sorted.length; i++) {
    const expected = sorted[i - 1] + 1
    const actual = sorted[i]
    
    for (let j = expected; j < actual; j++) {
      missing.push(j)
    }
  }
  
  return missing
}

function splitByGaps(images: ImageFile[], maxGap: number = 5): ImageFile[][] {
  if (images.length === 0) return []
  
  // Sort by frame number
  const sorted = [...images].sort((a, b) => (a.frameNumber || 0) - (b.frameNumber || 0))
  
  const groups: ImageFile[][] = [[sorted[0]]]
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].frameNumber || 0
    const curr = sorted[i].frameNumber || 0
    const gap = curr - prev
    
    if (gap > maxGap) {
      // Start a new group
      groups.push([sorted[i]])
    } else {
      // Add to current group
      groups[groups.length - 1].push(sorted[i])
    }
  }
  
  return groups
}

export function detectSequences(files: File[]): ImageSequence[] {
  // Create ImageFile objects
  const imageFiles: ImageFile[] = files.map((file, index) => {
    const { baseName, frameNumber } = extractFrameInfo(file.name)
    return {
      id: `${file.name}-${index}-${Date.now()}`,
      file,
      name: file.name,
      baseName,
      frameNumber,
      originalSize: file.size,
      convertedSize: null,
      convertedBlob: null,
      status: 'pending'
    }
  })
  
  // Group by base name
  const groups = new Map<string, ImageFile[]>()
  
  for (const img of imageFiles) {
    const key = img.baseName.toLowerCase()
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(img)
  }
  
  // Process each group
  const sequences: ImageSequence[] = []
  
  for (const [baseName, images] of groups) {
    // Check if this is a sequence (has frame numbers)
    const hasFrameNumbers = images.some(img => img.frameNumber !== null)
    
    if (hasFrameNumbers && images.length > 1) {
      // Split by gaps to handle multiple sequences with same base name
      const subGroups = splitByGaps(images)
      
      for (let i = 0; i < subGroups.length; i++) {
        const group = subGroups[i]
        const frameNumbers = group
          .map(img => img.frameNumber)
          .filter((n): n is number => n !== null)
        
        const missingFrames = findMissingFrames(frameNumbers)
        
        sequences.push({
          id: `seq-${baseName}-${i}-${Date.now()}`,
          baseName: subGroups.length > 1 ? `${baseName} (Part ${i + 1})` : baseName,
          images: group.sort((a, b) => (a.frameNumber || 0) - (b.frameNumber || 0)),
          isSequence: true,
          missingFrames,
          totalOriginalSize: group.reduce((sum, img) => sum + img.originalSize, 0),
          totalConvertedSize: 0
        })
      }
    } else {
      // Single images or images without frame numbers
      for (const img of images) {
        sequences.push({
          id: `single-${img.id}`,
          baseName: img.baseName,
          images: [img],
          isSequence: false,
          missingFrames: [],
          totalOriginalSize: img.originalSize,
          totalConvertedSize: 0
        })
      }
    }
  }
  
  // Sort sequences: sequences first, then singles
  return sequences.sort((a, b) => {
    if (a.isSequence && !b.isSequence) return -1
    if (!a.isSequence && b.isSequence) return 1
    return a.baseName.localeCompare(b.baseName)
  })
}
