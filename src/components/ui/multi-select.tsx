import { Check, ChevronDown, Loader2, Search } from 'lucide-react'
import { type KeyboardEvent, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
  /** Optional badge rendered after the label, e.g. "Recommended". */
  hint?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loading?: boolean
  disabled?: boolean
  className?: string
}

interface OptionRowProps {
  option: MultiSelectOption
  checked: boolean
  active: boolean
  onToggle: (value: string) => void
}

function OptionRow({ option, checked, active, onToggle }: OptionRowProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={() => onToggle(option.value)}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
        checked
          ? 'bg-teal-50 text-teal-800 dark:bg-teal-900/20 dark:text-teal-200'
          : 'text-gray-700 dark:text-gray-200',
        active && 'ring-1 ring-teal-300 dark:ring-teal-700'
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          checked
            ? 'border-teal-600 bg-teal-600 text-white'
            : 'border-gray-300 dark:border-gray-600'
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {option.hint && (
        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          {option.hint}
        </span>
      )}
    </button>
  )
}

function filterOptions(options: MultiSelectOption[], query: string): MultiSelectOption[] {
  const term = query.trim().toLowerCase()
  if (!term) return options

  return options.filter((option) => option.label.toLowerCase().includes(term))
}

/**
 * Searchable multi-select built on the Radix popover.
 *
 * Scales to large vocabularies: the options never render inline, only inside
 * the searchable dropdown, and the trigger summarises the current selection.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches found',
  loading = false,
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const visible = useMemo(() => filterOptions(options, query), [options, query])

  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
    )
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setQuery('')
      setActiveIndex(0)
    }
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (visible.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => (current + step + visible.length) % visible.length)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const option = visible[activeIndex]
      if (option) toggle(option.value)
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
            'flex h-10 w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-left text-sm transition-colors hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600',
            className
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              selected.length > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'
            )}
          >
            {selected.length > 0 ? `${selected.length} selected` : placeholder}
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

        <div role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto p-1">
          {visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-gray-400 text-xs">{emptyMessage}</p>
          ) : (
            visible.map((option, index) => (
              <OptionRow
                key={option.value}
                option={option}
                checked={selected.includes(option.value)}
                active={index === activeIndex}
                onToggle={toggle}
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-gray-200 border-t px-2 py-1.5 text-gray-500 text-xs dark:border-gray-700 dark:text-gray-400">
          <span>
            {selected.length} selected
            {visible.length !== options.length && ` · ${visible.length} shown`}
          </span>
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
            className="font-medium text-teal-600 hover:text-teal-700 disabled:opacity-40 dark:text-teal-400"
          >
            Clear
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
