import { useState } from "react";
import { ListChecks, Plus, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { featuresApi } from "@/api/features";

interface Props {
  data: { featureNames: string[]; categoryIds?: number[] };
  onChange: (data: { featureNames: string[] }) => void;
}

export function FeaturesStep({ data, onChange }: Props) {
  const [customFeature, setCustomFeature] = useState("");
  const categoryId = data.categoryIds?.[0];

  const { data: features = [], isLoading } = useQuery({
    queryKey: ["features", categoryId],
    queryFn: () => featuresApi.list(categoryId),
    enabled: !!categoryId,
  });

  const toggleFeature = (name: string) => {
    const names = data.featureNames.includes(name)
      ? data.featureNames.filter((f) => f !== name)
      : [...data.featureNames, name];
    onChange({ featureNames: names });
  };

  const addCustomFeature = () => {
    const name = customFeature.trim();
    if (name && !data.featureNames.includes(name)) {
      onChange({ featureNames: [...data.featureNames, name] });
      setCustomFeature("");
    }
  };

  const removeFeature = (name: string) => {
    onChange({ featureNames: data.featureNames.filter((f) => f !== name) });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
          <ListChecks className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Features</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Highlight what makes your product stand out
          </p>
        </div>
      </div>

      {!categoryId && (
        <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-400 dark:border-gray-700">
          Select a category first to see its available features.
        </div>
      )}

      {categoryId && isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {categoryId && !isLoading && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Available Features <span className="font-normal text-gray-400">(optional)</span>
          </h3>
          {features.length === 0 ? (
            <p className="mb-2 text-xs text-gray-400">
              No predefined features for this category. Add one below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {features.map((f) => {
                const active = data.featureNames.includes(f.name);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFeature(f.name)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "bg-teal-100 text-teal-700 border border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700"
                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    }`}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom feature */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          Add Custom Feature <span className="font-normal text-gray-400">(optional)</span>
        </h3>
        <div className="flex gap-2">
          <Input
            value={customFeature}
            onChange={(e) => setCustomFeature(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomFeature();
              }
            }}
            placeholder="e.g. UV Protection"
            className="h-10 flex-1"
          />
          <button
            type="button"
            onClick={addCustomFeature}
            disabled={!customFeature.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {data.featureNames.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.featureNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
              >
                {name}
                <button type="button" onClick={() => removeFeature(name)} className="hover:text-red-500">
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
