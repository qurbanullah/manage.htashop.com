import { useState, useRef, useCallback } from "react";
import { ImagePlus, X, GripVertical, Star, StarIcon, Loader2, AlertCircle, Upload } from "lucide-react";
import { type UploadResult } from "@/hooks/storage/useS3Upload";
import { storageApi } from "@/api/storage";
import { useToast } from "@/components/ui/Toaster";
import { generateImageVariants } from "@/utils/image-resize";

const ACCEPT = ".jpg,.jpeg,.png,.webp";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_GALLERY = 8;
const CDN_BASE = "https://cdn.htashop.com";

// ── Types ──

interface UploadingEntry {
  id: string;
  preview: string;
  progress: number;
  finalizing: boolean;
  error: string | null;
}

export interface ProductImagesData {
  featured: UploadResult | null;
  gallery: UploadResult[];
}

interface Props {
  data: ProductImagesData;
  onChange: (data: ProductImagesData) => void;
  uploadPrefix: string;
}

// ── Shared upload helper ──

async function uploadToS3(file: File, key: string): Promise<UploadResult> {
  // key = "products/{uuid}/images/featured.jpg"
  const lastSlash = key.lastIndexOf("/");
  const directory = key.slice(0, lastSlash);
  const baseFilename = key.slice(lastSlash + 1).replace(/\.[^.]+$/, "");
  const ext = key.split(".").pop() || "jpg";

  // Generate resized variants client-side (original + large/medium/small/thumb)
  const variants = await generateImageVariants(file);

  const uploadedVariants: Record<string, string> = {};
  let originalKey = "";

  for (const [suffix, blob] of Object.entries(variants)) {
    const filename = suffix === "original"
      ? `${baseFilename}.${ext}`
      : `${baseFilename}-${suffix}.jpg`;

    const presigned = await storageApi.getPresignedUrl(filename, "image/jpeg", directory, blob.size);
    if (!presigned.success || !presigned.data?.url) throw new Error("Failed to get upload URL");

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presigned.data!.url, true);
      xhr.setRequestHeader("Content-Type", "image/jpeg");
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(blob);
    });

    uploadedVariants[suffix] = presigned.data.key;
    if (suffix === "original") originalKey = presigned.data.key;
  }

  return {
    key: originalKey,
    original_filename: file.name,
    metadata: { size: file.size, content_type: file.type, last_modified: new Date().toISOString(), etag: "" },
    variants: uploadedVariants,
  };
}

// ── Main component ──

export function ProductImagesStep({ data, onChange, uploadPrefix }: Props) {
  const { error: showError } = useToast();
  const featuredInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isDraggingFeatured, setIsDraggingFeatured] = useState(false);
  const [isDraggingGallery, setIsDraggingGallery] = useState(false);
  const [featuredPreview, setFeaturedPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, UploadingEntry>>({});

  const validate = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return "JPEG, PNG, or WebP only";
    if (file.size > MAX_SIZE) return "Max 10MB per image";
    return null;
  };

  const createPreview = (file: File) => URL.createObjectURL(file);

  // ── Featured ──

  const handleFeaturedFile = useCallback(async (file: File) => {
    const err = validate(file);
    if (err) return showError(err);

    if (featuredPreview) URL.revokeObjectURL(featuredPreview);
    const preview = createPreview(file);
    setFeaturedPreview(preview);
    const uid = `featured-${Date.now()}`;
    setUploading((prev) => ({ ...prev, [uid]: { id: uid, preview, progress: 0, finalizing: false, error: null } }));

    try {
      const key = `${uploadPrefix}/images/featured.${file.name.split(".").pop()}`;
      const result = await uploadToS3(file, key);
      onChange({ ...dataRef.current, featured: result });
    } catch (e) {
      showError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading((prev) => { const { [uid]: _, ...rest } = prev; return rest; });
    }
  }, [onChange, uploadPrefix, featuredPreview, showError]);

  const removeFeatured = () => {
    if (featuredPreview) URL.revokeObjectURL(featuredPreview);
    setFeaturedPreview(null);
    onChange({ ...dataRef.current, featured: null });
  };

  // ── Gallery ──

  const uploadGalleryFile = useCallback(async (file: File, idx: number) => {
    const preview = createPreview(file);
    const uid = `gallery-${Date.now()}-${idx}`;
    setUploading((prev) => ({ ...prev, [uid]: { id: uid, preview, progress: 0, finalizing: false, error: null } }));

    try {
      const ext = file.name.split(".").pop();
      const key = `${uploadPrefix}/images/gallery-${Date.now()}-${idx}.${ext}`;
      const result = await uploadToS3(file, key);
      onChange({ ...dataRef.current, gallery: [...dataRef.current.gallery, result] });
    } catch (e) {
      showError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading((prev) => { const { [uid]: _, ...rest } = prev; return rest; });
    }
  }, [onChange, uploadPrefix, showError]);

  const processGalleryFiles = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const valid = fileArr.filter((f) => {
      const err = validate(f);
      if (err) showError(err);
      return !err;
    });
    if (valid.length === 0) return;
    const remaining = MAX_GALLERY - dataRef.current.gallery.length;
    if (valid.length > remaining) {
      showError(`Max ${MAX_GALLERY} gallery images (${remaining} slots left)`);
      return;
    }
    valid.forEach((f, i) => uploadGalleryFile(f, i));
  }, [uploadGalleryFile, showError]);

  const handleGalleryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingGallery(false);
    processGalleryFiles(e.dataTransfer.files);
  };

  const removeGallery = (index: number) => {
    onChange({ ...data, gallery: data.gallery.filter((_, i) => i !== index) });
  };

  const setFeaturedFromGallery = (index: number) => {
    const entry = data.gallery[index];
    if (!entry) return;
    const oldFeatured = data.featured;
    const newGallery = data.gallery.filter((_, i) => i !== index);
    if (oldFeatured) newGallery.push(oldFeatured);
    onChange({ featured: entry, gallery: newGallery });
  };

  // ── Reorder ──

  const handleReorderDragStart = (index: number) => setDragIndex(index);
  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...data.gallery];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved!);
    onChange({ ...data, gallery: reordered });
    setDragIndex(index);
  };
  const handleReorderDragEnd = () => setDragIndex(null);

  // Count uploading entries
  const uploadingCount = Object.keys(uploading).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <ImagePlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Product Images</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            JPEG, PNG, or WebP &middot; Max 10MB each &middot; Drag &amp; drop anywhere
          </p>
        </div>
      </div>

      {/* ── Featured Image ── */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Star className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Featured Image <span className="ml-1 text-red-500">*</span>
          </h3>
        </div>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Primary product photo — use a clean white/neutral background
        </p>

        {/* Uploaded */}
        {data.featured && featuredPreview ? (
          <div className="group relative w-64 overflow-hidden rounded-lg border-2 border-green-300 dark:border-green-600">
            <img src={featuredPreview} alt="Featured" className="h-48 w-full object-contain bg-gray-50 dark:bg-gray-800" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-2">
              <span className="text-xs font-medium text-white">{data.featured.original_filename}</span>
              <button onClick={removeFeatured} className="rounded-full bg-white/20 p-1 text-white hover:bg-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : uploadingCount > 0 && featuredPreview ? (
          <div className="relative w-64 overflow-hidden rounded-lg border-2 border-blue-300 dark:border-blue-600">
            <img src={featuredPreview} alt="" className="h-48 w-full object-contain bg-gray-50 opacity-50 dark:bg-gray-800" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-blue-500/10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Uploading...</span>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingFeatured(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingFeatured(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFeatured(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFeaturedFile(file);
            }}
            onClick={() => featuredInputRef.current?.click()}
            className={`flex h-32 w-64 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors ${
              isDraggingFeatured
                ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400"
                : "border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:border-gray-600 dark:hover:border-blue-400"
            }`}
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs font-medium">Drop image here or click</span>
          </div>
        )}
        <input
          ref={featuredInputRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => { if (e.target.files?.[0]) handleFeaturedFile(e.target.files[0]); }}
          className="hidden"
        />
      </div>

      {/* ── Gallery ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Gallery Images ({data.gallery.length}/{MAX_GALLERY})
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drag &amp; drop files here, or click to browse (optional)
            </p>
          </div>
          {data.gallery.length < MAX_GALLERY && (
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Upload className="h-3.5 w-3.5" /> Browse
            </button>
          )}
        </div>

        {/* Gallery drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes("Files")) setIsDraggingGallery(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingGallery(false); }}
          onDrop={handleGalleryDrop}
          className={`rounded-lg border-2 p-2 transition-colors ${
            isDraggingGallery
              ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
              : "border-transparent"
          }`}
        >
          {data.gallery.length === 0 && uploadingCount === 0 ? (
            <div
              onClick={() => galleryInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-10 text-gray-400 transition-colors hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            >
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Drop images here or click to browse</span>
              <span className="text-xs">Alternate angles, lifestyle shots, detail closeups</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {/* Existing uploaded gallery */}
              {data.gallery.map((entry, i) => (
                <div
                  key={entry.key || i}
                  draggable
                  onDragStart={() => handleReorderDragStart(i)}
                  onDragOver={(e) => handleReorderDragOver(e, i)}
                  onDragEnd={handleReorderDragEnd}
                  className={`group relative aspect-square overflow-hidden rounded-lg border-2 ${
                    dragIndex === i
                      ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
                      : "border-green-300 dark:border-green-600"
                  }`}
                >
                  <img
                    src={`${CDN_BASE}/${entry.key}`}
                    alt={`Gallery ${i + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <p className="truncate text-[10px] text-white">{entry.original_filename}</p>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => setFeaturedFromGallery(i)} className="rounded-full bg-white/80 p-1.5 text-amber-600 hover:bg-white" title="Set as featured">
                      <StarIcon className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeGallery(i)} className="rounded-full bg-white/80 p-1.5 text-red-500 hover:bg-white" title="Remove">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="absolute left-1 top-1 cursor-grab rounded bg-black/30 p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <GripVertical className="h-3 w-3 text-white" />
                  </div>
                </div>
              ))}

              {/* Uploading slots */}
              {Object.values(uploading).map((entry) => (
                <div key={entry.id} className="relative aspect-square overflow-hidden rounded-lg border-2 border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20">
                  {entry.error ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1 p-1">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className="text-[10px] text-red-500">Failed</span>
                    </div>
                  ) : (
                    <>
                      <img src={entry.preview} alt="" className="h-full w-full object-cover opacity-40" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                          {entry.finalizing ? "Finalizing" : `${entry.progress}%`}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Add-more slots */}
              {Array.from({ length: MAX_GALLERY - data.gallery.length - uploadingCount }).map((_, i) => (
                <button
                  key={`slot-${i}`}
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                >
                  <ImagePlus className="h-6 w-6" />
                </button>
              ))}
            </div>
          )}

          {isDraggingGallery && (
            <div className="mt-2 rounded-lg border-2 border-dashed border-blue-400 py-3 text-center text-xs font-medium text-blue-600 dark:text-blue-400">
              Drop files to add to gallery
            </div>
          )}
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => processGalleryFiles(e.target.files!)}
          className="hidden"
        />
      </div>
    </div>
  );
}
