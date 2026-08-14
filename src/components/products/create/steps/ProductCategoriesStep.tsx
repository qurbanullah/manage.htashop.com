import { useState, useRef, useEffect, useMemo } from "react";
import { Tags, FolderTree, X, Search, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoriesApi, type Category } from "@/api/categories";

interface Props {
  data: { categoryIds: number[]; tags: string[] };
  onChange: (data: { categoryIds: number[]; tags: string[] }) => void;
}

export function CategoriesStep({ data, onChange }: Props) {
  const [tagInput, setTagInput] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "tree"],
    queryFn: () => categoriesApi.tree(),
    staleTime: 10 * 60 * 1000,
  });

  // Flatten tree for search
  const flatCategories = useMemo(() => {
    const result: Category[] = [];
    const flatten = (cats: Category[]) => {
      for (const c of cats) {
        result.push(c);
        if (c.children) flatten(c.children);
      }
    };
    flatten(categories);
    return result;
  }, [categories]);

  // Build lookup map
  const catMap = useMemo(() => {
    const map = new Map<number, Category>();
    for (const c of flatCategories) map.set(c.id, c);
    return map;
  }, [flatCategories]);

  // Build parent trail for display
  const getCategoryPath = (id: number): string => {
    const parts: string[] = [];
    let current = catMap.get(id);
    while (current) {
      parts.unshift(current.name);
      current = current.parent_id ? catMap.get(current.parent_id) : undefined;
    }
    return parts.join(" → ");
  };

  // Filtered results
  const filtered = search.trim()
    ? flatCategories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : flatCategories;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleCategory = (id: number) => {
    const ids = data.categoryIds.includes(id)
      ? data.categoryIds.filter((c) => c !== id)
      : [...data.categoryIds, id];
    onChange({ ...data, categoryIds: ids });
  };

  const removeCategory = (id: number) => {
    onChange({ ...data, categoryIds: data.categoryIds.filter((c) => c !== id) });
  };

  // Tags
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !data.tags.includes(tag)) {
      onChange({ ...data, tags: [...data.tags, tag] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    onChange({ ...data, tags: data.tags.filter((t) => t !== tag) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <FolderTree className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Categories &amp; Tags</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Organize your product</p>
        </div>
      </div>

      {/* ── Category multi-select ── */}
      <div ref={dropdownRef} className="relative space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Categories <span className="ml-1 text-red-500">*</span>
        </Label>

        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
        >
          <span className={data.categoryIds.length > 0 ? "text-gray-700 dark:text-gray-200" : "text-gray-400"}>
            {data.categoryIds.length > 0
              ? `${data.categoryIds.length} categor${data.categoryIds.length === 1 ? "y" : "ies"} selected`
              : "Search and select categories..."}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute z-20 mt-1 max-h-72 w-[calc(100%-3rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
            <div className="border-b border-gray-100 p-2 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type to search..."
                  className="h-8 pl-8 text-xs"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-gray-400">No categories found</div>
              ) : (
                filtered.map((cat) => {
                  const checked = data.categoryIds.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(cat.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{cat.name}</span>
                      <span className="shrink-0 text-xs text-gray-400">{getCategoryPath(cat.id)}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Selected pills */}
        {data.categoryIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.categoryIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              >
                {catMap.get(id)?.name ?? `#${id}`}
                <button type="button" onClick={() => removeCategory(id)} className="hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Tags ── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Tags <span className="ml-1 font-normal text-gray-400">(optional)</span>
        </Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add a tag..."
            className="h-11"
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!tagInput.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <Tags className="h-4 w-4" />
            Add
          </button>
        </div>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
