import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type Category, categoriesApi } from '@/api/categories'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  value: number[]
  onChange: (ids: number[]) => void
}

/**
 * Flattened view of the category tree.
 *
 * `byId` keeps the parent_id for ancestors, `childrenByParent` uses the
 * structural parent from the tree payload (more reliable than parent_id),
 * and `ordered` is the pre-order list used for search results.
 */
interface CategoryIndex {
  byId: Map<number, Category>
  childrenByParent: Map<number | null, Category[]>
  roots: Category[]
  ordered: Category[]
}

function buildCategoryIndex(tree: Category[]): CategoryIndex {
  const index: CategoryIndex = {
    byId: new Map(),
    childrenByParent: new Map(),
    roots: [],
    ordered: [],
  }

  const visit = (nodes: Category[], parentId: number | null) => {
    for (const node of nodes) {
      index.byId.set(node.id, node)
      index.ordered.push(node)

      const siblings = index.childrenByParent.get(parentId)
      if (siblings) siblings.push(node)
      else index.childrenByParent.set(parentId, [node])

      if (node.children?.length) visit(node.children, node.id)
    }
  }

  visit(tree, null)
  index.roots = tree

  return index
}

/** Parent ids from the immediate parent up to the root. */
function ancestorsOf(index: CategoryIndex, id: number): number[] {
  const ancestors: number[] = []
  const seen = new Set<number>([id])
  let parentId = index.byId.get(id)?.parent_id ?? null

  while (parentId !== null && !seen.has(parentId)) {
    seen.add(parentId)
    ancestors.push(parentId)
    parentId = index.byId.get(parentId)?.parent_id ?? null
  }

  return ancestors
}

/** Every descendant id below the given category. */
function descendantsOf(index: CategoryIndex, id: number): number[] {
  const descendants: number[] = []
  const seen = new Set<number>([id])
  const stack = [id]

  while (stack.length > 0) {
    const current = stack.pop()
    if (current === undefined) break

    for (const child of index.childrenByParent.get(current) ?? []) {
      if (seen.has(child.id)) continue
      seen.add(child.id)
      descendants.push(child.id)
      stack.push(child.id)
    }
  }

  return descendants
}

/** Add every missing ancestor so a selected child always saves with its parents. */
function closeOverAncestors(index: CategoryIndex, ids: number[]): number[] {
  const closed = [...new Set(ids)]
  const included = new Set(closed)

  for (const id of closed) {
    if (!index.byId.has(id)) continue
    for (const ancestor of ancestorsOf(index, id)) {
      if (included.has(ancestor)) continue
      included.add(ancestor)
      closed.push(ancestor)
    }
  }

  return closed
}

function categoryPath(index: CategoryIndex, id: number): string {
  const parts: string[] = []
  const seen = new Set<number>()
  let current: Category | undefined = index.byId.get(id)

  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    parts.unshift(current.name)
    current = current.parent_id ? index.byId.get(current.parent_id) : undefined
  }

  return parts.join(' → ')
}

export function CategorySelector({ value, onChange }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => categoriesApi.tree(),
    staleTime: 10 * 60 * 1000,
  })

  const index = useMemo(() => buildCategoryIndex(categories), [categories])
  const selected = useMemo(() => new Set(value), [value])

  // Products saved before the "parent is implied" rule only carry the leaf
  // category. Close the selection over its ancestors as soon as the tree loads
  // so the parent ids are part of the payload the next time it is saved.
  useEffect(() => {
    const closed = closeOverAncestors(index, value)
    if (closed.length !== value.length) {
      onChange(closed)
    }
  }, [index, value, onChange])

  // Start with the roots expanded, then make sure every selected node is visible.
  const expandedInitialized = useRef(false)

  useEffect(() => {
    if (expandedInitialized.current || index.roots.length === 0) return
    expandedInitialized.current = true
    setExpanded(new Set(index.roots.map((root) => root.id)))
  }, [index])

  useEffect(() => {
    if (value.length === 0) return
    setExpanded((prev) => {
      const next = new Set(prev)
      let changed = false

      for (const id of value) {
        for (const ancestor of ancestorsOf(index, id)) {
          if (next.has(ancestor)) continue
          next.add(ancestor)
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [index, value])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const commitSelection = (ids: number[]) => {
    onChange([...new Set(ids)])
  }

  const deselectCategory = (id: number) => {
    // A parent cannot stay selected without its children, so remove the branch.
    const removed = new Set([id, ...descendantsOf(index, id)])
    commitSelection(value.filter((categoryId) => !removed.has(categoryId)))
  }

  const toggleCategory = (id: number) => {
    if (selected.has(id)) {
      deselectCategory(id)
      return
    }

    // Selecting a child selects (and saves) every ancestor.
    commitSelection([...value, id, ...ancestorsOf(index, id)])
  }

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const query = search.trim().toLowerCase()
  const searchResults = query
    ? index.ordered.filter((category) => category.name.toLowerCase().includes(query))
    : []

  return (
    <div ref={dropdownRef} className="relative space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
          Categories <span className="ml-1 text-red-500">*</span>
        </Label>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => commitSelection([])}
            className="font-medium text-gray-500 text-xs hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          >
            Clear all
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
        aria-label="Categories"
        className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
      >
        <span className={value.length > 0 ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}>
          {value.length > 0
            ? `${value.length} categor${value.length === 1 ? 'y' : 'ies'} selected`
            : 'Select categories...'}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform',
            dropdownOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <div className="border-gray-100 border-b p-2 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="h-8 pl-8 text-xs"
                autoFocus
              />
            </div>
            <p className="mt-1.5 px-1 text-[11px] text-gray-400 dark:text-gray-500">
              Selecting a subcategory automatically selects its parent categories.
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {query ? (
              <SearchResults
                results={searchResults}
                index={index}
                selected={selected}
                onToggle={toggleCategory}
              />
            ) : index.roots.length === 0 ? (
              <div className="px-3 py-6 text-center text-gray-400 text-sm">
                No categories available
              </div>
            ) : (
              <CategoryTree
                nodes={index.roots}
                depth={0}
                index={index}
                selected={selected}
                expanded={expanded}
                onToggleSelected={toggleCategory}
                onToggleExpanded={toggleExpanded}
              />
            )}
          </div>

          <div className="flex items-center justify-between border-gray-100 border-t px-3 py-2 dark:border-gray-700">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {value.length} selected
            </span>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false)
                setSearch('')
              }}
              className="rounded-md px-2 py-1 font-medium text-blue-600 text-xs hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Selected pills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((id) => {
            const category = index.byId.get(id)
            const name = category?.name ?? `#${id}`
            const path = category ? categoryPath(index, id) : name
            const hasChildren = (index.childrenByParent.get(id) ?? []).length > 0

            return (
              <span
                key={id}
                title={path}
                className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 font-medium text-purple-700 text-xs dark:bg-purple-900/30 dark:text-purple-300"
              >
                {name}
                <button
                  type="button"
                  onClick={() => deselectCategory(id)}
                  aria-label={
                    hasChildren ? `Remove ${name} and its subcategories` : `Remove ${name}`
                  }
                  className="hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface CategoryTreeProps {
  nodes: Category[]
  depth: number
  index: CategoryIndex
  selected: Set<number>
  expanded: Set<number>
  onToggleSelected: (id: number) => void
  onToggleExpanded: (id: number) => void
}

function CategoryTree({
  nodes,
  depth,
  index,
  selected,
  expanded,
  onToggleSelected,
  onToggleExpanded,
}: CategoryTreeProps) {
  return (
    <ul>
      {nodes.map((node) => {
        const children = index.childrenByParent.get(node.id) ?? []
        const hasChildren = children.length > 0
        const isExpanded = expanded.has(node.id)
        const isSelected = selected.has(node.id)

        return (
          <li key={node.id}>
            <div
              className="flex items-center gap-1 rounded-md pr-2 hover:bg-gray-50 dark:hover:bg-gray-700/40"
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggleExpanded(node.id)}
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                >
                  <ChevronRight
                    className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')}
                  />
                </button>
              ) : (
                <span className="h-6 w-6 shrink-0" aria-hidden="true" />
              )}

              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelected(node.id)}
                  className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                />
                <span
                  className={cn(
                    'truncate text-sm',
                    isSelected
                      ? 'font-medium text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  {node.name}
                </span>
                {hasChildren && (
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    {children.length}
                  </span>
                )}
              </label>
            </div>

            {hasChildren && isExpanded && (
              <CategoryTree
                nodes={children}
                depth={depth + 1}
                index={index}
                selected={selected}
                expanded={expanded}
                onToggleSelected={onToggleSelected}
                onToggleExpanded={onToggleExpanded}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface SearchResultsProps {
  results: Category[]
  index: CategoryIndex
  selected: Set<number>
  onToggle: (id: number) => void
}

function SearchResults({ results, index, selected, onToggle }: SearchResultsProps) {
  if (results.length === 0) {
    return <div className="px-3 py-6 text-center text-gray-400 text-sm">No categories found</div>
  }

  return (
    <div>
      {results.map((category) => (
        <label
          key={category.id}
          className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40"
        >
          <input
            type="checkbox"
            checked={selected.has(category.id)}
            onChange={() => onToggle(category.id)}
            className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
          />
          <span className="truncate text-gray-700 dark:text-gray-300">{category.name}</span>
          <span className="ml-auto shrink-0 truncate pl-2 text-[11px] text-gray-400">
            {categoryPath(index, category.id)}
          </span>
        </label>
      ))}
    </div>
  )
}
