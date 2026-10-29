import type { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const SELECT_CLASS =
  'h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100'

const ICON_TONES = {
  blue: {
    wrapper: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  amber: {
    wrapper: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  emerald: {
    wrapper: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  violet: {
    wrapper: 'bg-violet-100 dark:bg-violet-900/30',
    icon: 'text-violet-600 dark:text-violet-400',
  },
} as const

export function BuyerStepHeader({
  icon: Icon,
  title,
  description,
  tone = 'blue',
}: {
  icon: LucideIcon
  title: string
  description: string
  tone?: keyof typeof ICON_TONES
}) {
  const palette = ICON_TONES[tone]

  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${palette.wrapper}`}>
        <Icon className={`h-5 w-5 ${palette.icon}`} />
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 text-lg dark:text-white">{title}</h2>
        <p className="text-gray-500 text-sm dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

export function BuyerField({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  hint,
  error,
  autoComplete = 'off',
  required = false,
  optional = false,
  min,
  mono = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  hint?: string
  error?: string
  autoComplete?: string
  required?: boolean
  optional?: boolean
  min?: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
        {optional ? <span className="ml-1 font-normal text-gray-400">(optional)</span> : null}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        className={`h-11 ${mono ? 'font-mono' : ''} ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        autoComplete={autoComplete}
      />
      {error ? (
        <p className="text-red-600 text-xs dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-gray-400 text-xs dark:text-gray-500">{hint}</p>
      ) : null}
    </div>
  )
}
