import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { HelpCircle, Settings2, RotateCcw, Image, Globe, Sparkles, Zap, ChevronDown, Percent, ArrowLeftRight, ArrowUpDown, Maximize2 } from 'lucide-react'
import { ConversionSettings, DEFAULT_SETTINGS, DEFAULT_RESIZE, QualityPreset, ResizeMode, ResizeSettings, applyPreset } from '@/lib/converter'
import en from '@/i18n/en.json'

interface SettingsPanelProps {
  settings: ConversionSettings
  onChange: (settings: ConversionSettings) => void
  disabled?: boolean
}

interface SliderWithInputProps {
  id: string
  label: string
  tooltip: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  disabled?: boolean
  onChange: (value: number) => void
}

function SliderWithInput({
  id,
  label,
  tooltip,
  value,
  min,
  max,
  step,
  unit = '%',
  disabled,
  onChange
}: SliderWithInputProps) {
  // Use local state to allow empty input while typing
  const [inputValue, setInputValue] = useState(value.toString())
  const [isFocused, setIsFocused] = useState(false)

  // Sync with external value when not focused
  if (!isFocused && inputValue !== value.toString()) {
    setInputValue(value.toString())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value) // Allow any input while typing
  }

  const handleInputBlur = () => {
    setIsFocused(false)
    const newValue = parseInt(inputValue, 10)
    if (isNaN(newValue) || newValue < min) {
      onChange(min)
      setInputValue(min.toString())
    } else if (newValue > max) {
      onChange(max)
      setInputValue(max.toString())
    } else {
      onChange(newValue)
      setInputValue(newValue.toString())
    }
  }

  const handleInputFocus = () => {
    setIsFocused(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[220px]">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            id={`${id}-input`}
            value={inputValue}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            className="w-16 h-7 text-center text-xs font-mono px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs text-muted-foreground w-4">{unit}</span>
        </div>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([newValue]) => onChange(newValue)}
        disabled={disabled}
        className={disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/60 px-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

interface NumberInputProps {
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  disabled?: boolean
  onChange: (value: number) => void
  className?: string
}

function NumberInput({
  value,
  min,
  max,
  step = 1,
  unit = 'px',
  disabled,
  onChange,
  className = ''
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value.toString())
  const [isFocused, setIsFocused] = useState(false)

  if (!isFocused && inputValue !== value.toString()) {
    setInputValue(value.toString())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    setIsFocused(false)
    const newValue = parseInt(inputValue, 10)
    if (isNaN(newValue) || newValue < min) {
      onChange(min)
      setInputValue(min.toString())
    } else if (newValue > max) {
      onChange(max)
      setInputValue(max.toString())
    } else {
      onChange(newValue)
      setInputValue(newValue.toString())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Input
        type="number"
        value={inputValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        className="w-20 h-7 text-center text-xs font-mono px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}

interface PresetButtonProps {
  preset: QualityPreset
  currentPreset: QualityPreset
  label: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  recommended?: boolean
}

function PresetButton({ preset, currentPreset, label, description, icon, onClick, disabled, recommended }: PresetButtonProps) {
  const isActive = preset === currentPreset
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={`
            relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all
            ${isActive 
              ? 'border-primary bg-primary/10 text-primary' 
              : 'border-border/50 hover:border-primary/50 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {recommended && !isActive && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
          )}
          {icon}
          <span className="text-[10px] font-medium mt-1">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[180px]">
        <p className="text-xs">{description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

interface ResizeModeButtonProps {
  mode: ResizeMode
  currentMode: ResizeMode
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
}

function ResizeModeButton({ mode, currentMode, label, icon, onClick, disabled }: ResizeModeButtonProps) {
  const isActive = mode === currentMode
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all
        ${isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {icon}
      {label}
    </button>
  )
}

interface PercentageInputButtonProps {
  value: number
  isActive: boolean
  onClick: () => void
  onChange: (value: number) => void
  disabled?: boolean
}

function PercentageInputButton({ value, isActive, onClick, onChange, disabled }: PercentageInputButtonProps) {
  const [inputValue, setInputValue] = useState(value.toString())
  const [isFocused, setIsFocused] = useState(false)

  if (!isFocused && inputValue !== value.toString()) {
    setInputValue(value.toString())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    setIsFocused(false)
    const newValue = parseInt(inputValue, 10)
    if (isNaN(newValue) || newValue < 1) {
      onChange(1)
      setInputValue('1')
    } else if (newValue > 100) {
      onChange(100)
      setInputValue('100')
    } else {
      onChange(newValue)
      setInputValue(newValue.toString())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  const handleClick = () => {
    if (!isActive) {
      onClick()
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-center gap-0.5 px-2 py-1 rounded text-xs transition-all
        ${isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {isActive ? (
        <>
          <input
            type="number"
            value={inputValue}
            min={1}
            max={100}
            disabled={disabled}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-8 bg-transparent text-center text-xs font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span>%</span>
        </>
      ) : (
        <>
          <Percent className="w-3 h-3" />
          <span>{value}%</span>
        </>
      )}
    </div>
  )
}

export function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const isDefault = 
    settings.quality === DEFAULT_SETTINGS.quality &&
    settings.resize.mode === DEFAULT_RESIZE.mode &&
    settings.resize.percentage === DEFAULT_RESIZE.percentage &&
    settings.lossless === DEFAULT_SETTINGS.lossless &&
    settings.sharpen === DEFAULT_SETTINGS.sharpen &&
    settings.denoise === DEFAULT_SETTINGS.denoise &&
    settings.preset === DEFAULT_SETTINGS.preset

  const handleReset = () => {
    onChange(DEFAULT_SETTINGS)
  }

  const handlePresetChange = (preset: QualityPreset) => {
    onChange(applyPreset(preset, settings))
  }

  const handleSettingChange = (newSettings: Partial<ConversionSettings>) => {
    // When manually changing quality settings, switch to custom preset
    onChange({ 
      ...settings, 
      ...newSettings, 
      preset: 'custom' as QualityPreset 
    })
  }

  const handleResizeChange = (resizeUpdate: Partial<ResizeSettings>) => {
    // Resize changes do NOT affect preset
    onChange({
      ...settings,
      resize: { ...settings.resize, ...resizeUpdate }
    })
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Settings2 className="w-4 h-4 text-primary" />
            {en.settings.title}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleReset}
                disabled={disabled || isDefault}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Reset to defaults</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality Presets */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">
              {en.settings.presets.label}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px]">
                <p className="text-xs">{en.settings.presets.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <PresetButton
              preset="custom"
              currentPreset={settings.preset}
              label={en.settings.presets.custom}
              description={en.settings.presets.customDesc}
              icon={<Settings2 className="w-4 h-4" />}
              onClick={() => handlePresetChange('custom')}
              disabled={disabled}
            />
            <PresetButton
              preset="photo"
              currentPreset={settings.preset}
              label={en.settings.presets.photo}
              description={en.settings.presets.photoDesc}
              icon={<Image className="w-4 h-4" />}
              onClick={() => handlePresetChange('photo')}
              disabled={disabled}
            />
            <PresetButton
              preset="web"
              currentPreset={settings.preset}
              label={en.settings.presets.web}
              description={en.settings.presets.webDesc}
              icon={<Globe className="w-4 h-4" />}
              onClick={() => handlePresetChange('web')}
              disabled={disabled}
            />
            <PresetButton
              preset="crisp"
              currentPreset={settings.preset}
              label={en.settings.presets.crisp}
              description={en.settings.presets.crispDesc}
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => handlePresetChange('crisp')}
              disabled={disabled}
            />
            <PresetButton
              preset="webflowLike"
              currentPreset={settings.preset}
              label={en.settings.presets.webflowLike}
              description={en.settings.presets.webflowLikeDesc}
              icon={<Zap className="w-4 h-4" />}
              onClick={() => handlePresetChange('webflowLike')}
              disabled={disabled}
              recommended
            />
          </div>
        </div>

        {/* Quality */}
        <SliderWithInput
          id="quality"
          label={en.settings.quality.label}
          tooltip={en.settings.quality.tooltip}
          value={settings.quality}
          min={10}
          max={100}
          step={1}
          disabled={disabled || settings.lossless}
          onChange={(value) => handleSettingChange({ quality: value })}
        />

        {/* Resize Section */}
        <div className="space-y-3 pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">
              {en.settings.resize.label}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px]">
                <p className="text-xs">{en.settings.resize.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Resize Mode Buttons */}
          <div className="flex flex-wrap gap-1.5">
            <PercentageInputButton
              value={settings.resize.percentage}
              isActive={settings.resize.mode === 'percentage'}
              onClick={() => handleResizeChange({ mode: 'percentage' })}
              onChange={(value) => handleResizeChange({ percentage: value })}
              disabled={disabled}
            />
            <ResizeModeButton
              mode="width"
              currentMode={settings.resize.mode}
              label={en.settings.resize.modes.width}
              icon={<ArrowLeftRight className="w-3 h-3" />}
              onClick={() => handleResizeChange({ mode: 'width' })}
              disabled={disabled}
            />
            <ResizeModeButton
              mode="height"
              currentMode={settings.resize.mode}
              label={en.settings.resize.modes.height}
              icon={<ArrowUpDown className="w-3 h-3" />}
              onClick={() => handleResizeChange({ mode: 'height' })}
              disabled={disabled}
            />
            <ResizeModeButton
              mode="exact"
              currentMode={settings.resize.mode}
              label={en.settings.resize.modes.exact}
              icon={<Maximize2 className="w-3 h-3" />}
              onClick={() => handleResizeChange({ mode: 'exact' })}
              disabled={disabled}
            />
          </div>

          {/* Resize Value Input based on mode */}
          <div className="pt-2">
            {settings.resize.mode === 'width' && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Width:</Label>
                <NumberInput
                  value={settings.resize.width}
                  min={1}
                  max={10000}
                  disabled={disabled}
                  onChange={(value) => handleResizeChange({ width: value })}
                />
                <span className="text-xs text-muted-foreground">(aspect ratio preserved)</span>
              </div>
            )}

            {settings.resize.mode === 'height' && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Height:</Label>
                <NumberInput
                  value={settings.resize.height}
                  min={1}
                  max={10000}
                  disabled={disabled}
                  onChange={(value) => handleResizeChange({ height: value })}
                />
                <span className="text-xs text-muted-foreground">(aspect ratio preserved)</span>
              </div>
            )}

            {settings.resize.mode === 'exact' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-12">Width:</Label>
                  <NumberInput
                    value={settings.resize.width}
                    min={1}
                    max={10000}
                    disabled={disabled}
                    onChange={(value) => handleResizeChange({ width: value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-12">Height:</Label>
                  <NumberInput
                    value={settings.resize.height}
                    min={1}
                    max={10000}
                    disabled={disabled}
                    onChange={(value) => handleResizeChange({ height: value })}
                  />
                </div>
                <p className="text-[10px] text-amber-500/80">⚠️ May distort image</p>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Options Collapsible */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <button
              className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              disabled={disabled}
            >
              <span>{en.settings.advanced.title}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            {/* Denoise */}
            <SliderWithInput
              id="denoise"
              label={en.settings.denoise.label}
              tooltip={en.settings.denoise.tooltip}
              value={settings.denoise}
              min={0}
              max={50}
              step={5}
              disabled={disabled}
              onChange={(value) => handleSettingChange({ denoise: value })}
            />

            {/* Sharpen */}
            <SliderWithInput
              id="sharpen"
              label={en.settings.sharpen.label}
              tooltip={en.settings.sharpen.tooltip}
              value={settings.sharpen}
              min={0}
              max={60}
              step={5}
              disabled={disabled}
              onChange={(value) => handleSettingChange({ sharpen: value })}
            />

            {/* Lossless Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Label htmlFor="lossless" className="text-sm font-medium">
                  {en.settings.lossless.label}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[220px]">
                    <p className="text-xs">{en.settings.lossless.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="lossless"
                checked={settings.lossless}
                onCheckedChange={(checked) => handleSettingChange({ lossless: checked })}
                disabled={disabled}
              />
            </div>

            {/* Processing Info */}
            {(settings.denoise > 0 || settings.sharpen > 0) && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/30 space-y-2">
                <p className="text-xs font-medium text-foreground/80">
                  {en.settings.processing.title}
                </p>
                <div className="text-[11px] text-muted-foreground space-y-1">
                  {settings.denoise > 0 && (
                    <p>• {en.settings.processing.denoise.replace('{level}', 
                      settings.denoise <= 15 ? en.settings.levels.light : 
                      settings.denoise <= 30 ? en.settings.levels.medium : 
                      en.settings.levels.strong
                    )}</p>
                  )}
                  {settings.sharpen > 0 && (
                    <p>• {en.settings.processing.sharpen.replace('{level}', 
                      settings.sharpen <= 20 ? en.settings.levels.light : 
                      settings.sharpen <= 40 ? en.settings.levels.medium : 
                      en.settings.levels.strong
                    )}</p>
                  )}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
