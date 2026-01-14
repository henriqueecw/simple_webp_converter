import { TooltipProvider } from '@/components/ui/tooltip'
import { DropZone } from '@/components/DropZone'
import { SettingsPanel } from '@/components/SettingsPanel'
import { ImageList } from '@/components/ImageList'
import { PreviewPanel } from '@/components/PreviewPanel'
import { useImageConverter } from '@/hooks/useImageConverter'
import { Zap, Github } from 'lucide-react'
import en from '@/i18n/en.json'

function App() {
  const {
    sequences,
    settings,
    isConverting,
    addFiles,
    downloadSingle,
    downloadSequence,
    downloadAll,
    clear,
    updateSettings
  } = useImageConverter()

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">{en.app.title}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {en.app.subtitle}
                </p>
              </div>
            </div>
            
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          {/* Drop zone and settings row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DropZone 
                onFilesSelected={addFiles} 
                disabled={isConverting}
              />
            </div>
            
            <div className="lg:col-span-1">
              <SettingsPanel
                settings={settings}
                onChange={updateSettings}
                disabled={isConverting}
              />
            </div>
          </div>

          {/* Results */}
          <ImageList
            sequences={sequences}
            onDownloadSequence={downloadSequence}
            onDownloadSingle={downloadSingle}
            onDownloadAll={downloadAll}
            onClear={clear}
          />

          {/* Preview */}
          {sequences.length > 0 && (
            <PreviewPanel sequences={sequences} />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-auto">
          <div className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
            <p>
              All processing happens locally in your browser. 
              Your images are never uploaded to any server.
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}

export default App
