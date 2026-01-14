import { useCallback, useState, useRef } from 'react'
import { Upload, ImageIcon, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import en from '@/i18n/en.json'

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp']
const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif', '.webp']

// Check if file is an accepted image type
function isAcceptedImage(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true
  // Fallback to extension check for files without proper MIME type
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED_EXTENSIONS.includes(ext)
}

// Recursively read all files from a directory entry
async function readDirectoryEntries(entry: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = []
  const reader = entry.createReader()
  
  // Read all entries in the directory
  const readEntries = (): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })
  }

  // readEntries may not return all entries at once, need to call repeatedly
  let entries: FileSystemEntry[] = []
  let batch: FileSystemEntry[]
  do {
    batch = await readEntries()
    entries = entries.concat(batch)
  } while (batch.length > 0)

  // Process each entry
  for (const childEntry of entries) {
    if (childEntry.isFile) {
      const file = await getFileFromEntry(childEntry as FileSystemFileEntry)
      if (file && isAcceptedImage(file)) {
        files.push(file)
      }
    } else if (childEntry.isDirectory) {
      const subFiles = await readDirectoryEntries(childEntry as FileSystemDirectoryEntry)
      files.push(...subFiles)
    }
  }

  return files
}

// Get File object from FileSystemFileEntry
function getFileFromEntry(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise((resolve) => {
    entry.file(resolve, () => resolve(null))
  })
}

// Process DataTransfer items (handles both files and folders)
async function processDataTransferItems(items: DataTransferItemList): Promise<File[]> {
  const files: File[] = []
  const entries: FileSystemEntry[] = []

  // Get all entries first
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry()
      if (entry) {
        entries.push(entry)
      }
    }
  }

  // Process entries
  for (const entry of entries) {
    if (entry.isFile) {
      const file = await getFileFromEntry(entry as FileSystemFileEntry)
      if (file && isAcceptedImage(file)) {
        files.push(file)
      }
    } else if (entry.isDirectory) {
      const dirFiles = await readDirectoryEntries(entry as FileSystemDirectoryEntry)
      files.push(...dirFiles)
    }
  }

  return files
}

export function DropZone({ onFilesSelected, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !isProcessing) {
      setIsDragging(true)
    }
  }, [disabled, isProcessing])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled || isProcessing) return

    setIsProcessing(true)

    try {
      // Use webkitGetAsEntry for folder support
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const files = await processDataTransferItems(e.dataTransfer.items)
        if (files.length > 0) {
          onFilesSelected(files)
        }
      } else {
        // Fallback for browsers without webkitGetAsEntry
        const files = Array.from(e.dataTransfer.files).filter(isAcceptedImage)
        if (files.length > 0) {
          onFilesSelected(files)
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }, [disabled, isProcessing, onFilesSelected])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isProcessing) return

    const files = Array.from(e.target.files || []).filter(isAcceptedImage)

    if (files.length > 0) {
      onFilesSelected(files)
    }

    // Reset input
    e.target.value = ''
  }, [disabled, isProcessing, onFilesSelected])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled || isProcessing) return
    // Default click opens file picker
    fileInputRef.current?.click()
    e.preventDefault()
  }, [disabled, isProcessing])

  const handleFolderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled || isProcessing) return
    folderInputRef.current?.click()
  }, [disabled, isProcessing])

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 cursor-pointer",
        "hover:border-primary/50 hover:bg-primary/5",
        isDragging && "border-primary bg-primary/10 scale-[1.02]",
        (disabled || isProcessing) && "opacity-50 cursor-not-allowed"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileInput}
        disabled={disabled || isProcessing}
        className="hidden"
      />
      
      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error - webkitdirectory is not in types but works in browsers
        webkitdirectory=""
        onChange={handleFileInput}
        disabled={disabled || isProcessing}
        className="hidden"
      />
      
      <div className="flex flex-col items-center justify-center gap-4 pointer-events-none">
        <div className={cn(
          "p-4 rounded-full bg-primary/10 transition-transform duration-200",
          isDragging && "scale-110"
        )}>
          {isProcessing ? (
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isDragging ? (
            <ImageIcon className="w-8 h-8 text-primary" />
          ) : (
            <Upload className="w-8 h-8 text-primary" />
          )}
        </div>
        
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">
            {isProcessing ? 'Processing...' : en.dropzone.title}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {en.dropzone.subtitle}
          </p>
        </div>
        
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={handleFolderClick}
            disabled={disabled || isProcessing}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md",
              "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
              "transition-colors duration-200",
              (disabled || isProcessing) && "opacity-50 cursor-not-allowed"
            )}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Select Folder
          </button>
        </div>

        <p className="text-xs text-muted-foreground/70">
          {en.dropzone.hint} • Folders supported
        </p>
      </div>
    </div>
  )
}
