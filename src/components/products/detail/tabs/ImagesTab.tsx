import { ImagePlus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { damApi, type DamAsset } from "@/api/dam";

const CDN_BASE = "https://cdn.htashop.com";

interface Props {
  product: { id: number; uuid: string };
}

export function ImagesTab({ product }: Props) {
  const { data: assetsRes, isLoading } = useQuery({
    queryKey: ["dam", "assets", product.id],
    queryFn: () => damApi.getAssets("App\\Models\\Product", product.id),
  });

  const assets = (assetsRes?.data as DamAsset[]) ?? [];

  const cdnUrl = (key: string) => (key.startsWith("http") ? key : `${CDN_BASE}/${key}`);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12 dark:border-gray-700">
        <ImagePlus className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">No images</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No images uploaded for this product.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImagePlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Images ({assets.length})
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {assets.map((asset) => (
          <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <img
              src={cdnUrl(asset.object_key)}
              alt={asset.file_name}
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="truncate text-xs text-white">{asset.file_name}</p>
              <span className="text-[10px] text-gray-300">{asset.collection_name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
