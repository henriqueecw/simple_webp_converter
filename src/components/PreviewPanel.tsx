import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ImageCompare } from './ImageCompare'
import { ImageSequence } from '@/lib/sequence-detector'
import { formatBytes, getPercentageReduction } from '@/lib/utils'
import { 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Play,
  Pause,
  Repeat,
  ZoomIn,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Checkerboard pattern for transparency
const checkerboardStyle = {
  backgroundImage: `
    linear-gradient(45deg, #808080 25%, transparent 25%),
    linear-gradient(-45deg, #808080 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #808080 75%),
    linear-gradient(-45deg, transparent 75%, #808080 75%)
  `,
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
  backgroundColor: '#a0a0a0'
}

// Common zoom values
const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400]

interface PreviewPanelProps {
  sequences: ImageSequence[]
  className?: string
}

type ViewSource = 'original' | 'converted'

export function PreviewPanel({ sequences, className }: PreviewPanelProps) {
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState(0)
  const [compareEnabled, setCompareEnabled] = useState(true)
  const [viewSource, setViewSource] = useState<ViewSource>('converted')
  const [zoom, setZoom] = useState(100)
  const [zoomInput, setZoomInput] = useState('100')
  const [zoomPopoverOpen, setZoomPopoverOpen] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  
  // Sequence playback state (for non-compare mode)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fps, setFps] = useState(24)
  const [loop, setLoop] = useState(true)

  // Get current sequence
  const currentSequence = sequences[selectedSequenceIndex]
  const isSequence = currentSequence?.isSequence && currentSequence.images.length > 1
  const totalFrames = currentSequence?.images.length || 1

  // Reset frame when sequence changes
  useEffect(() => {
    setCurrentFrame(0)
    setIsPlaying(false)
  }, [selectedSequenceIndex])

  // Playback logic for non-compare mode
  useEffect(() => {
    if (!isSequence || !isPlaying || compareEnabled) return

    const interval = 1000 / fps
    const intervalId = window.setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + 1
        if (next >= totalFrames) {
          if (loop) {
            return 0
          } else {
            setIsPlaying(false)
            return prev
          }
        }
        return next
      })
    }, interval)

    return () => clearInterval(intervalId)
  }, [isSequence, isPlaying, fps, totalFrames, loop, compareEnabled])

  // Generate URLs for current image (single image or current frame)
  const currentImage = currentSequence?.images[currentFrame]
  
  const imageUrls = useMemo(() => {
    if (!currentImage) return null
    
    return {
      original: URL.createObjectURL(currentImage.file),
      converted: currentImage.convertedBlob 
        ? URL.createObjectURL(currentImage.convertedBlob) 
        : null
    }
  }, [currentImage])

  // Generate frames for sequence comparison
  const sequenceFrames = useMemo(() => {
    if (!currentSequence?.isSequence || currentSequence.images.length <= 1) return null
    
    const allReady = currentSequence.images.every(img => img.status === 'done' && img.convertedBlob)
    if (!allReady) return null

    return currentSequence.images
      .sort((a, b) => (a.frameNumber || 0) - (b.frameNumber || 0))
      .map(img => ({
        original: URL.createObjectURL(img.file),
        converted: img.convertedBlob ? URL.createObjectURL(img.convertedBlob) : ''
      }))
  }, [currentSequence])

  // Cleanup URLs
  useEffect(() => {
    return () => {
      if (imageUrls) {
        URL.revokeObjectURL(imageUrls.original)
        if (imageUrls.converted) URL.revokeObjectURL(imageUrls.converted)
      }
    }
  }, [imageUrls])

  // Cleanup sequence frame URLs
  useEffect(() => {
    return () => {
      if (sequenceFrames) {
        sequenceFrames.forEach(frame => {
          URL.revokeObjectURL(frame.original)
          if (frame.converted) URL.revokeObjectURL(frame.converted)
        })
      }
    }
  }, [sequenceFrames])

  // Update zoom input when zoom changes
  useEffect(() => {
    setZoomInput(String(zoom))
  }, [zoom])

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -10 : 10
    setZoom(prev => Math.min(400, Math.max(10, prev + delta)))
  }, [])

  // Attach wheel listener to preview container
  useEffect(() => {
    const container = previewContainerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handlePrevious = () => {
    setSelectedSequenceIndex(prev => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setSelectedSequenceIndex(prev => Math.min(sequences.length - 1, prev + 1))
  }

  const handleFpsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value > 0 && value <= 120) {
      setFps(value)
    }
  }

  const handleFpsBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (isNaN(value) || value < 1) {
      setFps(1)
    } else if (value > 120) {
      setFps(120)
    }
  }

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoomInput(e.target.value)
  }

  const applyZoomFromInput = () => {
    const value = parseInt(zoomInput, 10)
    if (isNaN(value) || value < 10) {
      setZoom(10)
      setZoomInput('10')
    } else if (value > 400) {
      setZoom(400)
      setZoomInput('400')
    } else {
      setZoom(value)
    }
    setZoomPopoverOpen(false)
  }

  const handleZoomInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyZoomFromInput()
    }
  }

  const handleZoomPresetClick = (value: number) => {
    setZoom(value)
    setZoomPopoverOpen(false)
  }

  if (sequences.length === 0 || !currentSequence) {
    return null
  }

  const isReady = currentImage?.status === 'done'
  const isSequenceReady = currentSequence.isSequence && 
    currentSequence.images.every(img => img.status === 'done')

  // Calculate size info
  const sizeInfo = useMemo(() => {
    if (currentSequence.isSequence && isSequenceReady) {
      const totalOriginal = currentSequence.images.reduce((sum, img) => sum + img.originalSize, 0)
      const totalConverted = currentSequence.images.reduce((sum, img) => sum + (img.convertedSize || 0), 0)
      return { 
        original: totalOriginal, 
        converted: totalConverted,
        frames: currentSequence.images.length
      }
    } else if (currentImage && isReady && currentImage.convertedSize) {
      return {
        original: currentImage.originalSize,
        converted: currentImage.convertedSize,
        frames: 1
      }
    }
    return null
  }, [currentSequence, currentImage, isReady, isSequenceReady])

  // Get URL for non-compare view
  const displayUrl = useMemo(() => {
    if (!imageUrls) return null
    if (viewSource === 'converted' && imageUrls.converted) {
      return imageUrls.converted
    }
    return imageUrls.original
  }, [imageUrls, viewSource])

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Eye className="w-4 h-4 text-primary" />
            Preview
          </CardTitle>
          
          <div className="flex items-center gap-3">
            {/* Zoom controls with dropdown */}
            <div className="flex items-center gap-1.5">
              <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
              <Popover open={zoomPopoverOpen} onOpenChange={setZoomPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-1 h-7 px-2 rounded-md border border-input bg-transparent text-xs font-mono hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <span className="w-8 text-center">{zoom}</span>
                    <span className="text-muted-foreground">%</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-2">
                    {/* Custom input */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={zoomInput}
                        min={10}
                        max={400}
                        onChange={handleZoomInputChange}
                        onKeyDown={handleZoomInputKeyDown}
                        className="h-8 text-center text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Custom"
                        autoFocus
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    
                    <Separator />
                    
                    {/* Preset values */}
                    <div className="grid grid-cols-3 gap-1">
                      {ZOOM_PRESETS.map(value => (
                        <Button
                          key={value}
                          variant={zoom === value ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs font-mono"
                          onClick={() => handleZoomPresetClick(value)}
                        >
                          {value}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Separator orientation="vertical" className="h-5" />

            {/* Compare toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="compare-toggle" className="text-xs text-muted-foreground">
                Compare
              </Label>
              <Switch
                id="compare-toggle"
                checked={compareEnabled}
                onCheckedChange={setCompareEnabled}
                disabled={!isReady && !isSequenceReady}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Scrollable canvas container */}
        <div 
          ref={previewContainerRef}
          className="overflow-auto max-h-[70vh] rounded-lg bg-muted/30 cursor-zoom-in"
          title="Scroll to zoom"
        >
          <div className="flex items-center justify-center min-h-[200px] p-4">
            {/* Main preview area */}
            {compareEnabled ? (
              <>
                {/* Sequence with animation in compare mode */}
                {isSequence && sequenceFrames ? (
                  <ImageCompare 
                    frames={sequenceFrames} 
                    fitToContainer={false} 
                    zoom={zoom}
                  />
                ) : imageUrls && isReady && imageUrls.converted ? (
                  <ImageCompare
                    originalSrc={imageUrls.original}
                    convertedSrc={imageUrls.converted}
                    fitToContainer={false}
                    zoom={zoom}
                  />
                ) : imageUrls && (
                  <div 
                    className="relative rounded-lg overflow-hidden"
                    style={checkerboardStyle}
                  >
                    <img
                      src={imageUrls.original}
                      alt={currentImage?.name}
                      style={{ 
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top left'
                      }}
                    />
                    {currentImage?.status === 'converting' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white text-sm">Converting...</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Single image display */}
                {displayUrl && (
                  <div 
                    className="relative rounded-lg overflow-hidden"
                    style={checkerboardStyle}
                  >
                    <img
                      src={displayUrl}
                      alt={currentImage?.name}
                      style={{ 
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top left'
                      }}
                    />
                    
                    {/* Frame counter for sequences */}
                    {isSequence && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/60 text-white text-xs font-mono backdrop-blur-sm">
                        {currentFrame + 1} / {totalFrames}
                      </div>
                    )}

                    {/* Source indicator */}
                    <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                      {viewSource === 'converted' && isReady ? 'WebP' : 'Original'}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Source toggle buttons (outside canvas) */}
        {!compareEnabled && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={viewSource === 'original' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewSource('original')}
            >
              Original
            </Button>
            <Button
              variant={viewSource === 'converted' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewSource('converted')}
              disabled={!isReady && !isSequenceReady}
            >
              WebP
            </Button>
          </div>
        )}

        {/* Sequence controls (outside canvas) */}
        {!compareEnabled && isSequence && (
          <div className="space-y-3">
            {/* Timeline slider */}
            <Slider
              value={[currentFrame]}
              min={0}
              max={totalFrames - 1}
              step={1}
              onValueChange={([value]) => {
                setCurrentFrame(value)
                setIsPlaying(false)
              }}
              className="cursor-pointer"
            />

            {/* Playback controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => {
                    if (currentFrame >= totalFrames - 1 && !loop) {
                      setCurrentFrame(0)
                    }
                    setIsPlaying(prev => !prev)
                  }}
                >
                  {isPlaying ? (
                    <><Pause className="h-3.5 w-3.5 mr-1.5" /> Pause</>
                  ) : (
                    <><Play className="h-3.5 w-3.5 mr-1.5" /> Play</>
                  )}
                </Button>

                <Button 
                  variant={loop ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setLoop(prev => !prev)}
                >
                  <Repeat className={cn('h-3.5 w-3.5', loop && 'text-primary')} />
                </Button>
              </div>

              {/* FPS control */}
              <div className="flex items-center gap-2">
                <Label htmlFor="preview-fps" className="text-xs text-muted-foreground whitespace-nowrap">
                  FPS
                </Label>
                <Input
                  id="preview-fps"
                  type="number"
                  value={fps}
                  min={1}
                  max={120}
                  onChange={handleFpsChange}
                  onBlur={handleFpsBlur}
                  className="w-14 h-7 text-center text-xs font-mono px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Size info */}
        {sizeInfo && (
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {sizeInfo.frames > 1 && <span>{sizeInfo.frames} frames</span>}
            {sizeInfo.frames > 1 && <span>•</span>}
            <span>{formatBytes(sizeInfo.original)}</span>
            <span>→</span>
            <span>{formatBytes(sizeInfo.converted)}</span>
            <span className="text-primary font-medium">
              -{getPercentageReduction(sizeInfo.original, sizeInfo.converted)}%
            </span>
          </div>
        )}

        <Separator />

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={selectedSequenceIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            <span className="font-medium">{currentSequence.baseName}</span>
            {sequences.length > 1 && (
              <span className="ml-1 opacity-60">
                ({selectedSequenceIndex + 1}/{sequences.length})
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={selectedSequenceIndex === sequences.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
