import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import { Fragment, type KeyboardEvent, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  /** Optional section header the option is listed under. */
  group?: string | null
  /** Optional second line shown under the label. */
  description?: string | null
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loading?: boolean
  disabled?: boolean
  /** Shows a clear button once a value is selected. */
  allowClear?: boolean
  className?: string
}

interface OptionRowProps {
  option: ComboboxOption
  selected: boolean
  active: boolean
  onSelect: (value: string) => void
}

function OptionRow({ option, selected, active, onSelect }: OptionRowProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(option.value)}
      className={cn(
        'flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
        selected
          ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200'
          : 'text-gray-700 dark:text-gray-200',
        active && 'ring-1 ring-indigo-300 dark:ring-indigo-700'
      )}
    >
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        {selected && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{option.label}</span>
        {option.description && (
          <span className="block truncate text-gray-400 text-xs dark:text-gray-500">
            {option.description}
          </span>
        )}
      </span>
    </button>
  )
}

function prepareOptions(options: ComboboxOption[], query: string): ComboboxOption[] {
  const term = query.trim().toLowerCase()
  const filtered = term
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(term) ||
          (option.description ?? '').toLowerCase().includes(term)
      )
    : options

  // Group headers rely on the list being ordered by group.
  return [...filtered].sort((a, b) => {
    const groupCompare = (a.group ?? '').localeCompare(b.group ?? '')
    return groupCompare !== 0 ? groupCompare : a.label.localeCompare(b.label)
  })
}

/**
 * Searchable single-select with optional section headers, built on the Radix
 * popover so long vocabularies never render inline.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches found',
  loading = false,
  disabled = false,
  allowClear = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const visible = useMemo(() => prepareOptions(options, query), [options, query])
  const selected = options.find((option) => option.value === value) ?? null

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setQuery('')
      setActiveIndex(0)
    }
  }

  const select = (next: string) => {
    onChange(next)
    handleOpenChange(false)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && visible.length > 0) {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => (current + step + visible.length) % visible.length)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const option = visible[activeIndex]
      if (option) select(option.value)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-left text-sm transition-colors hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600',
            className
          )}
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
          ) : (
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-gray-400 transition-transform',
                open && 'rotate-180'
              )}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <div className="border-gray-200 border-b p-2 dark:border-gray-700">
          <Input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            className="h-9"
          />
        </div>

        <div role="listbox" className="max-h-64 overflow-y-auto p-1">
          {visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-gray-400 text-xs">{emptyMessage}</p>
          ) : (
            visible.map((option, index) => (
              <Fragment key={option.value}>
                {option.group !== visible[index - 1]?.group && (
                  <div className="sticky top-0 bg-white px-2 py-1 font-semibold text-[10px] text-gray-400 uppercase dark:bg-gray-800">
                    {option.group ?? 'Other'}
                  </div>
                )}
                <OptionRow
                  option={option}
                  selected={option.value === value}
                  active={index === activeIndex}
                  onSelect={select}
                />
              </Fragment>
            ))
          )}
        </div>

        {allowClear && selected && (
          <div className="border-gray-200 border-t p-1 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                handleOpenChange(false)
              }}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-gray-500 text-xs hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <X className="h-3.5 w-3.5" /> Clear selection
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
