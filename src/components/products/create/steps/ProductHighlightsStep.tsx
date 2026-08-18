import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import {
  highlightsApi,
  type ManageHighlight,
  type ProductHighlightAssignment,
} from "@/api/highlights";

interface Props {
  data: { categoryIds: number[]; highlights: ProductHighlightAssignment[] };
  onChange: (data: { highlights: ProductHighlightAssignment[] }) => void;
}

export function ProductHighlightsStep({ data, onChange }: Props) {
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customHeading, setCustomHeading] = useState("");
  const [customBody, setCustomBody] = useState("");

  const { data: highlights = [], isLoading } = useQuery({
    queryKey: ["available-highlights", data.categoryIds],
    queryFn: () => highlightsApi.list(data.categoryIds.length ? data.categoryIds : undefined),
    enabled: data.categoryIds.length > 0,
  });

  const selectedIds = data.highlights.map((h) => h.highlight_id);

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange({ highlights: data.highlights.filter((h) => h.highlight_id !== id) });
    } else {
      onChange({
        highlights: [...data.highlights, { highlight_id: id, heading_override: "", body_override: "" }],
      });
    }
  };

  const updateOverride = (id: number, key: "heading_override" | "body_override", value: string) => {
    onChange({
      highlights: data.highlights.map((h) => (h.highlight_id === id ? { ...h, [key]: value } : h)),
    });
  };

  const overrideValue = (id: number, key: "heading_override" | "body_override") =>
    data.highlights.find((h) => h.highlight_id === id)?.[key] ?? "";

  const handleCreate = async () => {
    const body = customBody.trim();
    if (!body) {
      showError("Please enter a highlight body.");
      return;
    }

    try {
      setCreating(true);
      const created: ManageHighlight = await highlightsApi.create({
        body,
        heading: customHeading.trim() || undefined,
        category_ids: data.categoryIds,
      });

      // Refresh the available list and immediately select the new highlight.
      await queryClient.invalidateQueries({ queryKey: ["available-highlights", data.categoryIds] });

      onChange({
        highlights: [
          ...data.highlights.filter((h) => h.highlight_id !== created.id),
          { highlight_id: created.id, heading_override: "", body_override: "" },
        ],
      });

      setCustomHeading("");
      setCustomBody("");
      setShowCreate(false);
      showSuccess("Highlight added");
    } catch (e) {
      if (isApiError(e)) {
        if (e.errors) {
          showError(Object.values(e.errors).flat()[0] || e.message);
        } else {
          showError(e.message);
        }
      } else if (e instanceof Error) {
        showError(e.message);
      } else {
        showError("Failed to create highlight. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Highlights ("About this item")
        </h3>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Select highlights related to this product's categories. You can override the heading or body for this product.
      </p>

      {data.categoryIds.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Select categories first (in the Categories step) to see related highlights.
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {highlights.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No highlights available for the selected categories.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Add custom highlight
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {highlights.map((highlight) => {
                const selected = selectedIds.includes(highlight.id);
                return (
                  <div
                    key={highlight.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      selected ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20" : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggle(highlight.id)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">
                          {highlight.heading || highlight.label || "Highlight"}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{highlight.body}</span>
                      </span>
                    </label>

                    {selected && (
                      <div className="mt-3 space-y-2 pl-6">
                        <Input
                          placeholder="Heading override (optional)"
                          value={overrideValue(highlight.id, "heading_override")}
                          onChange={(e) => updateOverride(highlight.id, "heading_override", e.target.value)}
                          className="h-9 text-sm"
                        />
                        <Textarea
                          placeholder="Body override (optional)"
                          value={overrideValue(highlight.id, "body_override")}
                          onChange={(e) => updateOverride(highlight.id, "body_override", e.target.value)}
                          rows={2}
                          className="resize-none text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Custom highlight form — shared by the empty and populated states */}
          {highlights.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Add custom highlight
              </button>
            </div>
          )}

          {showCreate && (
            <div className="mt-3 space-y-2 rounded-xl border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-800 dark:bg-blue-950/20">
              <Input
                placeholder="Heading (optional)"
                value={customHeading}
                onChange={(e) => setCustomHeading(e.target.value)}
                className="h-9 text-sm"
              />
              <Textarea
                placeholder="Highlight body (required)"
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleCreate} disabled={creating || !customBody.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
