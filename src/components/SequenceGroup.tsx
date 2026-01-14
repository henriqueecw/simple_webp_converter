import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Download, 
  Film, 
  ImageIcon, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2
} from 'lucide-react'
import { ImageSequence, ImageFile } from '@/lib/sequence-detector'
import { formatBytes, getPercentageReduction, cn } from '@/lib/utils'
import en from '@/i18n/en.json'

interface SequenceGroupProps {
  sequence: ImageSequence
  onDownload: (sequence: ImageSequence) => void
  onDownloadSingle: (image: ImageFile) => void
}

export function SequenceGroup({ sequence, onDownload, onDownloadSingle }: SequenceGroupProps) {
  const [expanded, setExpanded] = useState(false)
  
  const completedCount = sequence.images.filter(img => img.status === 'done').length
  const totalCount = sequence.images.length
  const progress = (completedCount / totalCount) * 100
  const isComplete = completedCount === totalCount
  const isConverting = sequence.images.some(img => img.status === 'converting')
  
  const totalOriginal = sequence.images.reduce((sum, img) => sum + img.originalSize, 0)
  const totalConverted = sequence.images.reduce((sum, img) => sum + (img.convertedSize || 0), 0)
  const reduction = isComplete ? getPercentageReduction(totalOriginal, totalConverted) : 0

  return (
    <Card className={cn(
      "transition-all duration-200",
      isComplete && "border-primary/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {sequence.isSequence ? (
                <Film className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="truncate">{sequence.baseName}</span>
            </CardTitle>
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {sequence.isSequence ? (
                <Badge variant="secondary" className="text-xs">
                  {en.results.sequence} • {totalCount} {en.results.images}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {en.results.singleImage}
                </Badge>
              )}
              
              {sequence.missingFrames.length > 0 && (
                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {en.results.missingFrames}
                </Badge>
              )}
              
              {isComplete && (
                <Badge variant="success" className="text-xs">
                  -{reduction}% {en.results.reduction}
                </Badge>
              )}
            </div>
          </div>
          
          <Button
            size="sm"
            variant={isComplete ? "default" : "secondary"}
            onClick={() => onDownload(sequence)}
            disabled={!isComplete}
            className="shrink-0"
          >
            {isConverting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isComplete ? (
              <Download className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span className="ml-1 hidden sm:inline">
              {en.results.download}
            </span>
          </Button>
        </div>
        
        {/* Progress bar */}
        {!isComplete && (
          <div className="mt-3">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1">
              {completedCount} / {totalCount}
            </p>
          </div>
        )}
        
        {/* Size info */}
        {isComplete && (
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>{en.results.original}: {formatBytes(totalOriginal)}</span>
            <span>→</span>
            <span className="text-primary">{en.results.converted}: {formatBytes(totalConverted)}</span>
          </div>
        )}
      </CardHeader>
      
      {/* Expandable image list for sequences */}
      {sequence.isSequence && totalCount > 1 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-6 py-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Hide frames
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show {totalCount} frames
              </>
            )}
          </button>
          
          {expanded && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
                {sequence.images.map((img) => (
                  <div
                    key={img.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs",
                      img.status === 'done' && "bg-primary/5"
                    )}
                  >
                    <span className="truncate flex-1 mr-2">
                      {img.frameNumber !== null ? `#${img.frameNumber}` : img.name}
                    </span>
                    {img.status === 'done' && (
                      <button
                        onClick={() => onDownloadSingle(img)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    )}
                    {img.status === 'converting' && (
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </>
      )}
    </Card>
  )
}
