import { useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";

const ACCEPT = ".jpg,.jpeg,.png,.webp";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

interface Props {
  data: { imageFile: File | null; imagePreview: string | null };
  onChange: (data: { imageFile: File | null; imagePreview: string | null }) => void;
}

export function VariantImageStep({ data, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) return;
    if (file.size > MAX_SIZE) return;
    const preview = URL.createObjectURL(file);
    onChange({ imageFile: file, imagePreview: preview });
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <ImagePlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Image</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload a variant-specific photo (optional)</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        Upload an image for this variant (e.g., the blue version). Leave empty to use the product's featured image.
      </p>

      {data.imagePreview ? (
        <div className="relative w-full overflow-hidden rounded-lg border-2 border-green-300 dark:border-green-600">
          <img src={data.imagePreview} alt="Variant" className="h-64 w-full object-contain bg-gray-50 dark:bg-gray-800" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <span className="text-sm text-white">{data.imageFile?.name}</span>
          </div>
          <button
            onClick={() => onChange({ imageFile: null, imagePreview: null })}
            className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-red-500 hover:bg-white"
            title="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-16 transition-colors ${
            isDragging
              ? "border-amber-500 bg-amber-50 text-amber-600 dark:border-amber-400 dark:bg-amber-900/20 dark:text-amber-400"
              : "border-gray-300 text-gray-400 hover:border-amber-400 hover:text-amber-500 dark:border-gray-600 dark:hover:border-amber-400"
          }`}
        >
          <Upload className="h-10 w-10" />
          <span className="text-sm font-medium">Drag &amp; drop image here, or click to browse</span>
          <span className="text-xs">JPG, PNG, or WebP &middot; Max 10MB</span>
          <input type="file" accept={ACCEPT} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} className="hidden" />
        </label>
      )}
    </div>
  );
}
