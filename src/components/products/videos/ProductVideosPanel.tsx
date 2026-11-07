import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Film, ImagePlus, Loader2, Trash2, Upload, Video } from 'lucide-react'
import { useRef, useState } from 'react'
import { type DamAsset, damApi } from '@/api/dam'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toaster'
import { PRODUCT_IMAGE_ACCEPT, validateProductImage } from '@/utils/product-image-upload'
import {
  extractVideoPoster,
  PRODUCT_VIDEO_ACCEPT,
  PRODUCT_VIDEO_MAX_COUNT,
  productVideoUrl,
  uploadProductVideo,
  uploadVideoPoster,
  validateProductVideo,
  videoPosterMetadata,
} from '@/utils/product-video-upload'

const PRODUCT_DAM_TYPE = 'App\\Models\\Product'
const VIDEO_COLLECTION = 'video'

interface Props {
  product: { id: number; uuid: string }
}

interface PendingUpload {
  id: string
  name: string
  progress: number
  stage: 'video' | 'poster'
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'

  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function posterSrc(asset: DamAsset): string | undefined {
  const metadata = (asset.metadata ?? {}) as {
    poster_key?: string
    poster_variants?: Record<string, string>
  }
  const key =
    metadata.poster_variants?.medium ??
    metadata.poster_variants?.small ??
    metadata.poster_variants?.original ??
    metadata.poster_key

  return key ? productVideoUrl(key) : undefined
}

/**
 * Product video manager: uploads videos (with an auto-extracted poster) to the
 * DAM `video` collection, lets editors replace the thumbnail, and deletes clips.
 */
export function ProductVideosPanel({ product }: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const posterInputRef = useRef<HTMLInputElement>(null)

  const [pending, setPending] = useState<PendingUpload[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [posterTarget, setPosterTarget] = useState<DamAsset | null>(null)

  const queryKey = ['dam', 'assets', product.id, VIDEO_COLLECTION]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => damApi.getAssets(PRODUCT_DAM_TYPE, product.id, VIDEO_COLLECTION),
  })

  const videos = (data?.data as DamAsset[] | undefined) ?? []

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey })
    await queryClient.invalidateQueries({ queryKey: ['products'] })
    await queryClient.invalidateQueries({ queryKey: ['product'] })
  }

  const trackPending = (entry: PendingUpload) => setPending((prev) => [...prev, entry])
  const updatePending = (id: string, patch: Partial<PendingUpload>) =>
    setPending((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  const clearPending = (id: string) => setPending((prev) => prev.filter((e) => e.id !== id))

  async function uploadFile(file: File, index: number) {
    const id = `video-${Date.now()}-${index}`
    trackPending({ id, name: file.name, progress: 0, stage: 'video' })

    try {
      const directory = `products/${product.uuid}/videos`
      const upload = await uploadProductVideo(file, directory, (percent) =>
        updatePending(id, { progress: percent })
      )

      // Extract a frame and store it alongside the clip so the storefront can
      // render a poster without downloading the video.
      updatePending(id, { stage: 'poster', progress: 100 })
      const frame = await extractVideoPoster(file)
      const poster = frame ? await uploadVideoPoster(frame, `${directory}/posters`) : null

      const response = await damApi.ingest({
        damable_type: PRODUCT_DAM_TYPE,
        damable_id: product.id,
        file_name: upload.original_filename || file.name,
        object_key: upload.key,
        mime_type: upload.metadata?.content_type ?? file.type ?? 'video/mp4',
        collection_name: VIDEO_COLLECTION,
        sort_order: videos.length + index,
        metadata: videoPosterMetadata(poster),
      })

      if (!response.success) throw new Error(response.message || 'Could not save the video')

      await refresh()
      showSuccess('Video uploaded')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      clearPending(id)
    }
  }

  function handleFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter((file) => {
      const invalid = validateProductVideo(file)
      if (invalid) showError(invalid)
      return !invalid
    })

    if (accepted.length === 0) return

    const remaining = PRODUCT_VIDEO_MAX_COUNT - videos.length - pending.length
    if (accepted.length > remaining) {
      showError(`Up to ${PRODUCT_VIDEO_MAX_COUNT} videos per product (${remaining} slots left)`)
      return
    }

    void (async () => {
      for (const [index, file] of accepted.entries()) {
        await uploadFile(file, index)
      }
    })()
  }

  async function replacePoster(asset: DamAsset, file: File) {
    const invalid = validateProductImage(file)
    if (invalid) return showError(invalid)

    setBusyId(asset.id)
    try {
      const poster = await uploadVideoPoster(file, `products/${product.uuid}/videos/posters`)
      const response = await damApi.update(asset.id, { metadata: videoPosterMetadata(poster) })

      if (!response.success) throw new Error(response.message || 'Could not save the thumbnail')

      await refresh()
      showSuccess('Video thumbnail updated')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'The thumbnail could not be saved')
    } finally {
      setBusyId(null)
    }
  }

  async function removeVideo(asset: DamAsset) {
    setBusyId(asset.id)
    try {
      const response = await damApi.delete(asset.id)
      if (!response.success) throw new Error(response.message || 'Could not remove the video')

      await refresh()
      showSuccess('Video removed')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'The video could not be removed')
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const slotsLeft = PRODUCT_VIDEO_MAX_COUNT - videos.length - pending.length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
            <Film className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Product Videos</h2>
            <p className="text-gray-500 text-sm dark:text-gray-400">
              MP4, WebM or MOV &middot; Max 100MB &middot; Up to {PRODUCT_VIDEO_MAX_COUNT} videos
            </p>
          </div>
        </div>

        {slotsLeft > 0 && (
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Add video
          </Button>
        )}
      </div>

      {videos.length === 0 && pending.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-gray-200 border-dashed py-12 text-gray-400 transition-colors hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
        >
          <Video className="h-9 w-9" />
          <span className="font-medium text-sm">No videos yet</span>
          <span className="text-xs">
            Upload a demo, unboxing or installation clip — a thumbnail is generated automatically
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-gray-700"
            >
              <video
                src={productVideoUrl(asset.object_key)}
                poster={posterSrc(asset)}
                preload="metadata"
                muted
                playsInline
                className="aspect-video w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white text-xs">{asset.file_name}</p>
                  <p className="text-[10px] text-gray-300">
                    {formatSize(asset.size)} &middot; {asset.mime_type}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => {
                      setPosterTarget(asset)
                      posterInputRef.current?.click()
                    }}
                    title="Replace thumbnail"
                    className="rounded-full bg-white/90 p-1.5 text-gray-700 hover:bg-white disabled:opacity-50"
                  >
                    {busyId === asset.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void removeVideo(asset)}
                    title="Remove video"
                    className="rounded-full bg-white/90 p-1.5 text-red-600 hover:bg-white disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {pending.map((entry) => (
            <div
              key={entry.id}
              className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border-2 border-blue-300 border-dashed bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
            >
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="max-w-[80%] truncate text-[11px] text-blue-700 dark:text-blue-300">
                {entry.name}
              </span>
              <span className="font-medium text-[10px] text-blue-600 dark:text-blue-400">
                {entry.stage === 'poster' ? 'Generating thumbnail…' : `${entry.progress}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-gray-400 text-xs dark:text-gray-500">
        The thumbnail is captured from the clip automatically. Replace it to show a specific frame
        or product shot.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={PRODUCT_VIDEO_ACCEPT}
        multiple
        onChange={(event) => {
          if (event.target.files) handleFiles(event.target.files)
          event.target.value = ''
        }}
        className="hidden"
      />

      <input
        ref={posterInputRef}
        type="file"
        accept={PRODUCT_IMAGE_ACCEPT}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file && posterTarget) void replacePoster(posterTarget, file)
          setPosterTarget(null)
          event.target.value = ''
        }}
        className="hidden"
      />
    </div>
  )
}
