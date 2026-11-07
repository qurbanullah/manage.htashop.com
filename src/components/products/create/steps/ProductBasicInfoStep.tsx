import { Globe, Package, Tags, X } from 'lucide-react'
import { useState } from 'react'
import { RichTextEditor } from '@/components/products/create/editor/RichTextEditor'
import { CategorySelector } from '@/components/products/create/steps/ProductCategorySelector'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  data: {
    name: string
    slug: string
    categoryIds: number[]
    tags: string[]
    summary: string
    description: string
  }
  onChange: (data: Partial<Props['data']>) => void
  slugDisabled?: boolean
  uploadPrefix: string
}

/**
 * Identity and classification: name, slug, categories, tags, summary and the
 * rich description.
 */
export function BasicInfoStep({ data, onChange, slugDisabled = false, uploadPrefix }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Basic Information</h2>
          <p className="text-gray-500 text-sm dark:text-gray-400">
            Name, classification and description
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
          Product name <span className="ml-1 text-red-500">*</span>
        </Label>
        <Input
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Wireless Bluetooth Headphones"
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">Product slug</Label>
        <div className="relative">
          <Globe className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={data.slug}
            onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            placeholder="auto-generated"
            disabled={slugDisabled}
            className="h-11 pl-10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
          />
        </div>
        <p className="text-gray-400 text-xs dark:text-gray-500">Auto-generated from product name</p>
      </div>

      <CategorySelector
        value={data.categoryIds}
        onChange={(categoryIds) => onChange({ categoryIds })}
      />

      <TagsField tags={data.tags} onChange={(tags) => onChange({ tags })} />

      <div className="space-y-1.5">
        <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
          Summary <span className="ml-1 font-normal text-gray-400">(optional)</span>
        </Label>
        <Input
          value={data.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
          placeholder="High-quality wireless headphones with noise cancellation"
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
          Description <span className="ml-1 font-normal text-gray-400">(optional)</span>
        </Label>
        <RichTextEditor
          value={data.description}
          onChange={(description) => onChange({ description })}
          uploadPrefix={uploadPrefix}
        />
      </div>
    </div>
  )
}

interface TagsFieldProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

function TagsField({ tags, onChange }: TagsFieldProps) {
  const [input, setInput] = useState('')

  const add = () => {
    const tag = input.trim().toLowerCase()

    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
      setInput('')
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
        Tags <span className="ml-1 font-normal text-gray-400">(optional)</span>
      </Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Add a tag..."
          className="h-11"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-4 font-medium text-gray-700 text-sm hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <Tags className="h-4 w-4" />
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((candidate) => candidate !== tag))}
                className="hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
