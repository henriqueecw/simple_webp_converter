import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle, Settings2, RotateCcw } from 'lucide-react'
import { ConversionSettings, DEFAULT_SETTINGS } from '@/lib/converter'
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10)
    if (!isNaN(newValue)) {
      onChange(Math.min(max, Math.max(min, newValue)))
    }
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10)
    if (isNaN(newValue) || newValue < min) {
      onChange(min)
    } else if (newValue > max) {
      onChange(max)
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
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
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

export function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const isDefault = 
    settings.quality === DEFAULT_SETTINGS.quality &&
    settings.resize === DEFAULT_SETTINGS.resize &&
    settings.lossless === DEFAULT_SETTINGS.lossless

  const handleReset = () => {
    onChange(DEFAULT_SETTINGS)
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
        {/* Quality */}
        <SliderWithInput
          id="quality"
          label={en.settings.quality.label}
          tooltip={en.settings.quality.tooltip}
          value={settings.quality}
          min={10}
          max={100}
          step={5}
          disabled={disabled || settings.lossless}
          onChange={(value) => onChange({ ...settings, quality: value })}
        />

        {/* Resize */}
        <SliderWithInput
          id="resize"
          label={en.settings.resize.label}
          tooltip={en.settings.resize.tooltip}
          value={settings.resize}
          min={10}
          max={100}
          step={5}
          disabled={disabled}
          onChange={(value) => onChange({ ...settings, resize: value })}
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
            onCheckedChange={(checked) => onChange({ ...settings, lossless: checked })}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  )
}
