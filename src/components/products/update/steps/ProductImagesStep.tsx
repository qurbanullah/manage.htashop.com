import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  GripVertical,
  ImagePlus,
  Loader2,
  Star,
  StarIcon,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { type DamAsset, damApi } from '@/api/dam'
import { ImageDropzone } from '@/components/products/shared/ImageDropzone'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toaster'
import type { UploadResult } from '@/hooks/storage/useS3Upload'
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_MAX_GALLERY,
  productImageUrl,
  uploadProductImage,
  validateProductImage,
} from '@/utils/product-image-upload'

const PRODUCT_DAM_TYPE = 'App\\Models\\Product'

const FEATURED = 'featured'
const GALLERY = 'gallery'

interface Props {
  product: { id: number; uuid: string }
}

interface PendingUpload {
  id: string
  preview: string
}

function fileExtension(file: File): string {
  return file.name.split('.').pop() || 'jpg'
}

function sortGallery(assets: DamAsset[], order: number[] | null): DamAsset[] {
  const gallery = assets.filter((asset) => asset.collection_name !== FEATURED)

  if (order === null) return gallery

  const byId = new Map(gallery.map((asset) => [asset.id, asset]))
  const ordered = order
    .map((id) => byId.get(id))
    .filter((asset): asset is DamAsset => asset !== undefined)

  // Keep assets that were ingested after the cached order was captured.
  const seen = new Set(ordered.map((asset) => asset.id))
  return [...ordered, ...gallery.filter((asset) => !seen.has(asset.id))]
}

export function ProductImagesStep({ product }: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const queryClient = useQueryClient()
  const featuredInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [pending, setPending] = useState<PendingUpload[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [localOrder, setLocalOrder] = useState<number[] | null>(null)

  const queryKey = ['dam', 'assets', product.id]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => damApi.getAssets(PRODUCT_DAM_TYPE, product.id),
  })

  const assets = (data?.data as DamAsset[] | undefined) ?? []
  const featured = assets.find((asset) => asset.collection_name === FEATURED) ?? null
  const gallery = sortGallery(assets, localOrder)

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey })
    await queryClient.invalidateQueries({ queryKey: ['products'] })
    await queryClient.invalidateQueries({ queryKey: ['product'] })
  }

  const trackPending = (entry: PendingUpload) => setPending((prev) => [...prev, entry])
  const clearPending = (id: string) => setPending((prev) => prev.filter((e) => e.id !== id))

  async function ingest(entry: UploadResult, collection: string, sortOrder: number) {
    const response = await damApi.ingest({
      damable_type: PRODUCT_DAM_TYPE,
      damable_id: product.id,
      file_name: entry.original_filename || collection,
      object_key: entry.key,
      mime_type: 'image/jpeg',
      collection_name: collection,
      sort_order: sortOrder,
      metadata: { variants: entry.variants ?? {} },
    })

    if (!response.success) throw new Error(response.message || 'Could not save the image')

    return response
  }

  async function uploadFeatured(file: File) {
    const invalid = validateProductImage(file)
    if (invalid) return showError(invalid)

    const id = `featured-${Date.now()}`
    trackPending({ id, preview: URL.createObjectURL(file) })

    try {
      const key = `products/${product.uuid}/images/featured-${Date.now()}.${fileExtension(file)}`
      const upload = await uploadProductImage(file, key)

      await ingest(upload, FEATURED, 0)

      // Demote the previous hero shot only once the replacement is stored.
      if (featured) await damApi.update(featured.id, { collection_name: GALLERY })

      await refresh()
      showSuccess('Featured image updated')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      clearPending(id)
    }
  }

  async function uploadGalleryFile(file: File, sortOrder: number) {
    const id = `gallery-${Date.now()}-${sortOrder}`
    trackPending({ id, preview: URL.createObjectURL(file) })

    try {
      const key = `products/${product.uuid}/images/gallery-${Date.now()}.${fileExtension(file)}`
      const upload = await uploadProductImage(file, key)
      await ingest(upload, GALLERY, sortOrder)
      await refresh()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      clearPending(id)
    }
  }

  function uploadGallery(files: FileList | File[]) {
    const accepted = Array.from(files).filter((file) => {
      const invalid = validateProductImage(file)
      if (invalid) showError(invalid)
      return !invalid
    })

    if (accepted.length === 0) return

    const remaining = PRODUCT_IMAGE_MAX_GALLERY - gallery.length - pending.length
    if (accepted.length > remaining) {
      showError(`Max ${PRODUCT_IMAGE_MAX_GALLERY} gallery images (${remaining} slots left)`)
      return
    }

    accepted.forEach((file, index) => {
      void uploadGalleryFile(file, gallery.length + index)
    })
  }

  const removeAsset = (asset: DamAsset) =>
    mutate(asset.id, () => damApi.delete(asset.id), 'Image removed')

  async function mutate(id: number, run: () => Promise<unknown>, message: string) {
    setBusyId(id)
    try {
      await run()
      await refresh()
      showSuccess(message)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'The change could not be saved')
    } finally {
      setBusyId(null)
    }
  }

  async function promoteToFeatured(asset: DamAsset) {
    setBusyId(asset.id)
    try {
      await damApi.update(asset.id, { collection_name: FEATURED, sort_order: 0 })
      if (featured) await damApi.update(featured.id, { collection_name: GALLERY })
      await refresh()
      showSuccess('Featured image updated')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'The change could not be saved')
    } finally {
      setBusyId(null)
    }
  }

  function reorder(from: number, to: number) {
    if (from === to) return

    const next = [...gallery]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)

    setLocalOrder(next.map((asset) => asset.id))
    setDragIndex(to)
  }

  async function persistOrder() {
    if (localOrder === null) return

    setDragIndex(null)

    try {
      await Promise.all(localOrder.map((id, index) => damApi.update(id, { sort_order: index })))
      await refresh()
      // The refetched list is authoritative from here on.
      setLocalOrder(null)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'The new order could not be saved')
      setLocalOrder(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const gallerySlots = PRODUCT_IMAGE_MAX_GALLERY - gallery.length - pending.length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <ImagePlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Product Images</h2>
          <p className="text-gray-500 text-sm dark:text-gray-400">
            JPEG, PNG, or WebP &middot; Max 10MB each &middot; Changes save immediately
          </p>
        </div>
      </div>

      {/* Featured image */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Star className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-gray-700 text-sm dark:text-gray-200">Featured Image</h3>
        </div>
        <p className="mb-2 text-gray-500 text-xs dark:text-gray-400">
          Primary product photo shown on listings and the storefront hero slot
        </p>

        <ImageDropzone
          onFiles={(files) => {
            const file = files[0]
            if (file) void uploadFeatured(file)
          }}
          disabled={pending.some((entry) => entry.id.startsWith('featured'))}
          className="w-64 rounded-lg"
          activeClassName="ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900"
        >
          {featured ? (
            <div className="group relative w-64 overflow-hidden rounded-lg border-2 border-amber-300 dark:border-amber-600">
              <img
                src={productImageUrl(featured.object_key)}
                alt={featured.file_name}
                className="h-48 w-full bg-gray-50 object-contain dark:bg-gray-800"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="truncate font-medium text-white text-xs">
                  {featured.file_name}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => featuredInputRef.current?.click()}
                    title="Replace featured image"
                    className="rounded-full bg-white/90 p-1 text-gray-700 hover:bg-white"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busyId === featured.id}
                    onClick={() => removeAsset(featured)}
                    title="Remove featured image"
                    className="rounded-full bg-white/90 p-1 text-red-600 hover:bg-white disabled:opacity-50"
                  >
                    {busyId === featured.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : pending.some((entry) => entry.id.startsWith('featured')) ? (
            <div className="flex h-32 w-64 flex-col items-center justify-center gap-2 rounded-lg border-2 border-blue-300 border-dashed dark:border-blue-600">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="font-medium text-blue-700 text-xs dark:text-blue-300">
                Uploading...
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => featuredInputRef.current?.click()}
              className="flex h-32 w-64 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-gray-300 border-dashed text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500 dark:border-gray-600"
            >
              <Upload className="h-6 w-6" />
              <span className="font-medium text-xs">Drop image here or click</span>
            </button>
          )}
        </ImageDropzone>

        <input
          ref={featuredInputRef}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void uploadFeatured(file)
            event.target.value = ''
          }}
          className="hidden"
        />
      </div>

      {/* Gallery */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-700 text-sm dark:text-gray-200">
              Gallery Images ({gallery.length}/{PRODUCT_IMAGE_MAX_GALLERY})
            </h3>
            <p className="text-gray-500 text-xs dark:text-gray-400">
              Drag to reorder &middot; drop files to add &middot; star to promote to featured
            </p>
          </div>
          {gallerySlots > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-1"
            >
              <Upload className="h-3.5 w-3.5" /> Add images
            </Button>
          )}
        </div>

        <ImageDropzone
          onFiles={uploadGallery}
          disabled={pending.length > 0}
          className="rounded-lg border-2 border-transparent p-1 transition-colors"
          activeClassName="border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
        >
          {gallery.length === 0 && pending.length === 0 ? (
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-gray-200 border-dashed py-10 text-gray-400 transition-colors hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            >
              <Upload className="h-8 w-8" />
              <span className="font-medium text-sm">Drop images here or click to browse</span>
              <span className="text-xs">Alternate angles, lifestyle shots, detail closeups</span>
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {gallery.map((asset, index) => (
                // biome-ignore lint/a11y/noStaticElementInteractions: draggable tile has no ARIA equivalent
                <div
                  key={asset.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (dragIndex !== null) reorder(dragIndex, index)
                  }}
                  onDragEnd={() => void persistOrder()}
                  className={`group relative aspect-square overflow-hidden rounded-lg border-2 ${
                    dragIndex === index
                      ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <img
                    src={productImageUrl(asset.object_key)}
                    alt={asset.file_name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <p className="truncate text-[10px] text-white">{asset.file_name}</p>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void promoteToFeatured(asset)}
                      title="Set as featured"
                      className="rounded-full bg-white/90 p-1.5 text-amber-600 hover:bg-white disabled:opacity-50"
                    >
                      <StarIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void removeAsset(asset)}
                      title="Remove"
                      className="rounded-full bg-white/90 p-1.5 text-red-600 hover:bg-white disabled:opacity-50"
                    >
                      {busyId === asset.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="absolute top-1 left-1 cursor-grab rounded bg-black/30 p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <GripVertical className="h-3 w-3 text-white" />
                  </div>
                </div>
              ))}

              {pending
                .filter((entry) => entry.id.startsWith('gallery'))
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="relative aspect-square overflow-hidden rounded-lg border-2 border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
                  >
                    <img
                      src={entry.preview}
                      alt=""
                      className="h-full w-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      <span className="font-medium text-[10px] text-blue-600 dark:text-blue-400">
                        Uploading
                      </span>
                    </div>
                  </div>
                ))}

              {Array.from({ length: Math.max(gallerySlots, 0) }).map((_, index) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: placeholder slots have no stable identifier
                  key={`slot-${index}`}
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-lg border-2 border-gray-200 border-dashed text-gray-400 transition-colors hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                >
                  <ImagePlus className="h-6 w-6" />
                </button>
              ))}
            </div>
          )}
        </ImageDropzone>

        <input
          ref={galleryInputRef}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          multiple
          onChange={(event) => {
            if (event.target.files) uploadGallery(event.target.files)
            event.target.value = ''
          }}
          className="hidden"
        />
      </div>

      {pending.length > 0 && (
        <p className="flex items-center gap-2 text-blue-600 text-xs dark:text-blue-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {pending.length} upload{pending.length > 1 ? 's' : ''} in progress
        </p>
      )}
    </div>
  )
}
