import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Pause, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageFrame {
  original: string
  converted: string
}

interface ImageCompareProps {
  /** Single image comparison */
  originalSrc?: string
  convertedSrc?: string
  /** Sequence of images for animation */
  frames?: ImageFrame[]
  originalLabel?: string
  convertedLabel?: string
  /** Whether to fit to container (true) or use zoom percentage of original size */
  fitToContainer?: boolean
  /** Zoom percentage of original image size (100 = 1:1 pixels) */
  zoom?: number
  className?: string
}

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

export function ImageCompare({
  originalSrc,
  convertedSrc,
  frames,
  originalLabel = 'Original',
  convertedLabel = 'WebP',
  fitToContainer = true,
  zoom = 100,
  className
}: ImageCompareProps) {
  const [position, setPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fps, setFps] = useState(24)
  const [loop, setLoop] = useState(true)
  const [containerWidth, setContainerWidth] = useState(0)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<number | null>(null)

  // Determine if we're in sequence mode
  const isSequence = frames && frames.length > 1
  const totalFrames = frames?.length || 1

  // Get current images
  const currentOriginal = frames ? frames[currentFrame]?.original : originalSrc
  const currentConverted = frames ? frames[currentFrame]?.converted : convertedSrc

  // Load image dimensions when source changes
  useEffect(() => {
    if (!currentConverted && !currentOriginal) return
    
    const img = new Image()
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = currentConverted || currentOriginal || ''
  }, [currentConverted, currentOriginal])

  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    
    // Use ResizeObserver for accurate size tracking
    const resizeObserver = new ResizeObserver(updateWidth)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', updateWidth)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [])

  // Playback logic for sequences
  useEffect(() => {
    if (!isSequence || !isPlaying) return

    const interval = 1000 / fps
    intervalRef.current = window.setInterval(() => {
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

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isSequence, isPlaying, fps, totalFrames, loop])

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setPosition(percentage)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    handleMove(e.clientX)
  }, [handleMove])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    handleMove(e.touches[0].clientX)
  }, [handleMove])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      handleMove(e.touches[0].clientX)
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, handleMove])

  const handlePlayPause = useCallback(() => {
    if (currentFrame >= totalFrames - 1 && !loop) {
      setCurrentFrame(0)
    }
    setIsPlaying(prev => !prev)
  }, [currentFrame, totalFrames, loop])

  const handleFpsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value > 0 && value <= 120) {
      setFps(value)
    }
  }, [])

  const handleFpsBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (isNaN(value) || value < 1) {
      setFps(1)
    } else if (value > 120) {
      setFps(120)
    }
  }, [])

  // Calculate actual display dimensions based on zoom
  const displayWidth = fitToContainer ? undefined : Math.round(imageDimensions.width * (zoom / 100))
  const displayHeight = fitToContainer ? undefined : Math.round(imageDimensions.height * (zoom / 100))

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Compare viewport */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-lg cursor-col-resize select-none',
          fitToContainer && 'w-full aspect-video'
        )}
        style={{
          ...checkerboardStyle,
          ...(fitToContainer ? {} : { 
            width: displayWidth ? `${displayWidth}px` : 'auto',
            height: displayHeight ? `${displayHeight}px` : 'auto'
          })
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Converted image (bottom layer) */}
        {currentConverted && (
          <img
            src={currentConverted}
            alt="Converted"
            className={cn(
              fitToContainer && "absolute inset-0 w-full h-full object-contain"
            )}
            style={fitToContainer ? {} : {
              width: displayWidth ? `${displayWidth}px` : 'auto',
              height: displayHeight ? `${displayHeight}px` : 'auto'
            }}
            draggable={false}
          />
        )}
        
        {/* Original image (top layer, clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          {currentOriginal && containerWidth > 0 && (
            <img
              src={currentOriginal}
              alt="Original"
              className={cn(
                "absolute inset-0",
                fitToContainer && "h-full object-contain"
              )}
              style={{ 
                width: fitToContainer ? `${containerWidth}px` : (displayWidth ? `${displayWidth}px` : 'auto'),
                height: fitToContainer ? undefined : (displayHeight ? `${displayHeight}px` : 'auto'),
                maxWidth: 'none'
              }}
              draggable={false}
            />
          )}
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        >
          {/* Handle grip */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-muted-foreground/40 rounded-full" />
              <div className="w-0.5 h-4 bg-muted-foreground/40 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium backdrop-blur-sm z-10">
          {originalLabel}
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium backdrop-blur-sm z-10">
          {convertedLabel}
        </div>

        {/* Frame counter for sequences */}
        {isSequence && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/60 text-white text-xs font-mono backdrop-blur-sm z-10">
            {currentFrame + 1} / {totalFrames}
          </div>
        )}
      </div>

      {/* Sequence controls */}
      {isSequence && (
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
                onClick={handlePlayPause}
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
              <Label htmlFor="compare-fps" className="text-xs text-muted-foreground whitespace-nowrap">
                FPS
              </Label>
              <Input
                id="compare-fps"
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
    </div>
  )
}
