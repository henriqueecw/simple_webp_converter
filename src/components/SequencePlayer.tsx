import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ChevronFirst, 
  ChevronLast,
  Repeat,
  Eye,
  EyeOff
} from 'lucide-react'
import { ImageFile } from '@/lib/sequence-detector'
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

interface SequencePlayerProps {
  images: ImageFile[]
  showConverted?: boolean
  className?: string
}

export function SequencePlayer({ images, showConverted = true, className }: SequencePlayerProps) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fps, setFps] = useState(24)
  const [loop, setLoop] = useState(true)
  const [showConvertedView, setShowConvertedView] = useState(showConverted)
  const intervalRef = useRef<number | null>(null)

  // Sort images by frame number
  const sortedImages = useMemo(() => 
    [...images].sort((a, b) => (a.frameNumber || 0) - (b.frameNumber || 0)),
    [images]
  )

  const currentImage = sortedImages[currentFrame]
  const totalFrames = sortedImages.length

  // Generate image URLs
  const imageUrls = useMemo(() => {
    return sortedImages.map(img => ({
      original: URL.createObjectURL(img.file),
      converted: img.convertedBlob ? URL.createObjectURL(img.convertedBlob) : null
    }))
  }, [sortedImages])

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      imageUrls.forEach(urls => {
        URL.revokeObjectURL(urls.original)
        if (urls.converted) URL.revokeObjectURL(urls.converted)
      })
    }
  }, [imageUrls])

  // Playback logic
  useEffect(() => {
    if (isPlaying) {
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
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaying, fps, totalFrames, loop])

  const handlePlayPause = useCallback(() => {
    if (currentFrame >= totalFrames - 1 && !loop) {
      setCurrentFrame(0)
    }
    setIsPlaying(prev => !prev)
  }, [currentFrame, totalFrames, loop])

  const handleFirst = useCallback(() => {
    setCurrentFrame(0)
    setIsPlaying(false)
  }, [])

  const handleLast = useCallback(() => {
    setCurrentFrame(totalFrames - 1)
    setIsPlaying(false)
  }, [totalFrames])

  const handlePrevious = useCallback(() => {
    setCurrentFrame(prev => Math.max(0, prev - 1))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentFrame(prev => Math.min(totalFrames - 1, prev + 1))
  }, [totalFrames])

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

  const currentUrl = showConvertedView && imageUrls[currentFrame]?.converted
    ? imageUrls[currentFrame].converted
    : imageUrls[currentFrame]?.original

  const allConverted = sortedImages.every(img => img.status === 'done')

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Image display */}
      <div 
        className="relative aspect-video rounded-lg overflow-hidden"
        style={checkerboardStyle}
      >
        {currentUrl && (
          <img
            src={currentUrl}
            alt={`Frame ${currentFrame + 1}`}
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        
        {/* Frame info overlay */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-white text-xs font-mono backdrop-blur-sm">
          {currentImage?.frameNumber !== null 
            ? `Frame ${currentImage.frameNumber}`
            : `${currentFrame + 1} / ${totalFrames}`
          }
        </div>

        {/* View indicator */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
          {showConvertedView && allConverted ? 'WebP' : 'Original'}
        </div>
      </div>

      {/* Timeline slider */}
      <div className="space-y-2">
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
        <div className="flex justify-between text-[10px] text-muted-foreground/60 px-0.5">
          <span>1</span>
          <span>{totalFrames}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFirst}>
                <ChevronFirst className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">First frame</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevious}>
                <SkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Previous frame</p></TooltipContent>
          </Tooltip>

          <Button 
            variant="default" 
            size="icon" 
            className="h-9 w-9" 
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Next frame</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLast}>
                <ChevronLast className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Last frame</p></TooltipContent>
          </Tooltip>
        </div>

        {/* FPS control */}
        <div className="flex items-center gap-2">
          <Label htmlFor="fps" className="text-xs text-muted-foreground whitespace-nowrap">
            FPS
          </Label>
          <Input
            id="fps"
            type="number"
            value={fps}
            min={1}
            max={120}
            onChange={handleFpsChange}
            onBlur={handleFpsBlur}
            className="w-14 h-7 text-center text-xs font-mono px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Toggle controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={loop ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setLoop(prev => !prev)}
              >
                <Repeat className={cn('h-4 w-4', loop && 'text-primary')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">{loop ? 'Loop on' : 'Loop off'}</p></TooltipContent>
          </Tooltip>

          {allConverted && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showConvertedView ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setShowConvertedView(prev => !prev)}
                >
                  {showConvertedView ? (
                    <Eye className="h-4 w-4 text-primary" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{showConvertedView ? 'Viewing WebP' : 'Viewing Original'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}
