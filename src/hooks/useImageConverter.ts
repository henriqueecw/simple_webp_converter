import { useState, useCallback } from 'react'
import { ImageSequence, ImageFile, detectSequences } from '@/lib/sequence-detector'
import { ConversionSettings, DEFAULT_SETTINGS, convertToWebP, getWebPFileName } from '@/lib/converter'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export function useImageConverter() {
  const [sequences, setSequences] = useState<ImageSequence[]>([])
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS)
  const [isConverting, setIsConverting] = useState(false)

  const addFiles = useCallback(async (files: File[]) => {
    // Detect sequences from new files
    const newSequences = detectSequences(files)
    
    // Add to existing sequences
    setSequences(prev => [...prev, ...newSequences])
    
    // Start converting
    setIsConverting(true)
    
    // Convert each image
    for (const sequence of newSequences) {
      for (const image of sequence.images) {
        try {
          // Update status to converting
          setSequences(prev => prev.map(seq => ({
            ...seq,
            images: seq.images.map(img =>
              img.id === image.id ? { ...img, status: 'converting' as const } : img
            )
          })))
          
          // Convert
          const blob = await convertToWebP(image.file, settings)
          
          // Update with result
          setSequences(prev => prev.map(seq => ({
            ...seq,
            images: seq.images.map(img =>
              img.id === image.id
                ? {
                    ...img,
                    status: 'done' as const,
                    convertedBlob: blob,
                    convertedSize: blob.size
                  }
                : img
            )
          })))
        } catch (error) {
          // Update with error
          setSequences(prev => prev.map(seq => ({
            ...seq,
            images: seq.images.map(img =>
              img.id === image.id
                ? {
                    ...img,
                    status: 'error' as const,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  }
                : img
            )
          })))
        }
      }
    }
    
    setIsConverting(false)
  }, [settings])

  const downloadSingle = useCallback((image: ImageFile) => {
    if (!image.convertedBlob) return
    saveAs(image.convertedBlob, getWebPFileName(image.name))
  }, [])

  const downloadSequence = useCallback(async (sequence: ImageSequence) => {
    const completedImages = sequence.images.filter(img => img.status === 'done' && img.convertedBlob)
    
    if (completedImages.length === 0) return
    
    if (completedImages.length === 1) {
      // Single image - direct download
      downloadSingle(completedImages[0])
      return
    }
    
    // Multiple images - create ZIP
    const zip = new JSZip()
    
    for (const image of completedImages) {
      if (image.convertedBlob) {
        zip.file(getWebPFileName(image.name), image.convertedBlob)
      }
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, `${sequence.baseName}.zip`)
  }, [downloadSingle])

  const downloadAll = useCallback(async () => {
    const zip = new JSZip()
    
    for (const sequence of sequences) {
      const folder = sequences.length > 1 ? zip.folder(sequence.baseName) : zip
      
      for (const image of sequence.images) {
        if (image.status === 'done' && image.convertedBlob) {
          folder?.file(getWebPFileName(image.name), image.convertedBlob)
        }
      }
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, 'webp-converted.zip')
  }, [sequences])

  const clear = useCallback(() => {
    setSequences([])
  }, [])

  const updateSettings = useCallback((newSettings: ConversionSettings) => {
    setSettings(newSettings)
  }, [])

  return {
    sequences,
    settings,
    isConverting,
    addFiles,
    downloadSingle,
    downloadSequence,
    downloadAll,
    clear,
    updateSettings
  }
}
