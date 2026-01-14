import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SequenceGroup } from './SequenceGroup'
import { ImageSequence, ImageFile } from '@/lib/sequence-detector'
import { Download, Trash2, Images } from 'lucide-react'
import { formatBytes, getPercentageReduction } from '@/lib/utils'
import en from '@/i18n/en.json'

interface ImageListProps {
  sequences: ImageSequence[]
  onDownloadSequence: (sequence: ImageSequence) => void
  onDownloadSingle: (image: ImageFile) => void
  onDownloadAll: () => void
  onClear: () => void
}

export function ImageList({
  sequences,
  onDownloadSequence,
  onDownloadSingle,
  onDownloadAll,
  onClear
}: ImageListProps) {
  const totalImages = sequences.reduce((sum, seq) => sum + seq.images.length, 0)
  const completedImages = sequences.reduce(
    (sum, seq) => sum + seq.images.filter(img => img.status === 'done').length,
    0
  )
  const allComplete = totalImages > 0 && completedImages === totalImages
  
  const totalOriginal = sequences.reduce(
    (sum, seq) => sum + seq.images.reduce((s, img) => s + img.originalSize, 0),
    0
  )
  const totalConverted = sequences.reduce(
    (sum, seq) => sum + seq.images.reduce((s, img) => s + (img.convertedSize || 0), 0),
    0
  )
  const totalReduction = allComplete ? getPercentageReduction(totalOriginal, totalConverted) : 0

  if (sequences.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Images className="w-4 h-4" />
            {en.results.title}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onClear}
            >
              <Trash2 className="w-4 h-4" />
              <span className="ml-1 hidden sm:inline">{en.results.clear}</span>
            </Button>
            
            {sequences.length > 1 && (
              <Button
                size="sm"
                onClick={onDownloadAll}
                disabled={!allComplete}
              >
                <Download className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">{en.results.downloadAll}</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Summary stats */}
        {allComplete && (
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{totalImages} {en.results.images}</span>
            <span>•</span>
            <span>{formatBytes(totalOriginal)} → {formatBytes(totalConverted)}</span>
            <span>•</span>
            <span className="text-primary font-medium">-{totalReduction}%</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {sequences.map((sequence) => (
          <SequenceGroup
            key={sequence.id}
            sequence={sequence}
            onDownload={onDownloadSequence}
            onDownloadSingle={onDownloadSingle}
          />
        ))}
      </CardContent>
    </Card>
  )
}
