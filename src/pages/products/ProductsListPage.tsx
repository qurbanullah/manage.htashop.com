import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, Search, Loader2, ChevronDown, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddProductModal } from "@/components/products/create/modals/AddProductModal";
import { productsApi, type ProductData } from "@/api/products";
import { categoriesApi, type Category } from "@/api/categories";

export default function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "tree"],
    queryFn: () => categoriesApi.tree(),
    staleTime: 10 * 60 * 1000,
  });

  // Flatten the category tree for a searchable single-select filter
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

  const selectedCategory = flatCategories.find((c) => String(c.id) === categoryId);
  const filteredCategories = categorySearch.trim()
    ? flatCategories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
    : flatCategories;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
        setCategorySearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasFilters = Boolean(search || status || categoryId);

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setCategoryId("");
  };

  const { data: productsRes, isLoading, isError } = useQuery({
    queryKey: ["products", search, status, categoryId],
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (search) params.search = search;
      if (status) params.status = status;
      if (categoryId) params.category_id = Number(categoryId);
      return productsApi.list(Object.keys(params).length ? params : undefined);
    },
    staleTime: 0, // Always fetch fresh data after create
  });

  // Backend wraps paginated collection: { data: { data: [...], links, meta } }
  // Also handles flat array if pagination is absent
  const rawData = productsRes?.data as Record<string, unknown> | undefined;
  const products = (Array.isArray(rawData?.data) ? rawData.data : Array.isArray(rawData) ? rawData : []) as ProductData[];
  const hasProducts = products.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your product catalog
          </p>
        </div>
        <Button
          variant="outline"
          className="inline-flex items-center gap-2 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-900/20"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search & filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="product-search"
              name="product-search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search name, SKU, part number, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10"
            />
          </div>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="published">Published</option>
          </select>

          {/* Category filter */}
          <div ref={categoryRef} className="relative lg:w-64">
            <button
              type="button"
              onClick={() => setCategoryOpen(!categoryOpen)}
              className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {selectedCategory ? (
                <span className="truncate text-gray-700 dark:text-gray-200">{selectedCategory.name}</span>
              ) : (
                <span className="text-gray-400">All categories</span>
              )}
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
            </button>

            {categoryOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-72 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
                <div className="border-b border-gray-100 p-2 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search categories..."
                      className="h-8 pl-8 text-xs"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryId("");
                      setCategoryOpen(false);
                      setCategorySearch("");
                    }}
                    className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  >
                    All categories
                  </button>
                  {filteredCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(String(c.id));
                        setCategoryOpen(false);
                        setCategorySearch("");
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        String(c.id) === categoryId ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <span className="truncate text-gray-700 dark:text-gray-200">{c.name}</span>
                      {c.level !== undefined && c.level > 0 && (
                        <span className="ml-2 shrink-0 text-xs text-gray-400">sub</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="inline-flex items-center gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-red-200 py-20 dark:border-red-800">
          <Package className="mb-4 h-12 w-12 text-red-300 dark:text-red-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load products</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please try again later.</p>
        </div>
      )}

      {/* Product list */}
      {!isLoading && !isError && hasProducts && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 hidden md:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {products.map((product) => (
                <tr key={product.uuid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <Link to={`/products/${product.route_key}`} className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
                      {product.name}
                    </Link>
                    {product.summary && (
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {product.summary}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}>
                      {product.status || "draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    {new Date(product.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && !hasProducts && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20 dark:border-gray-700">
          <Package className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {hasFilters ? "No products match your filters" : "No products yet"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {hasFilters ? "Try adjusting or clearing your filters." : "Get started by adding your first product to the catalog."}
          </p>
          {hasFilters ? (
            <Button className="mt-6 inline-flex items-center gap-2" variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          ) : (
            <Button className="mt-6 inline-flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add your first product
            </Button>
          )}
        </div>
      )}

      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => {
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }}
      />
    </div>
  );
}
