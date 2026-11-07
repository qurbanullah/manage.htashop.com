import { Film, ImagePlus, Loader2, Trash2, Upload, Video } from 'lucide-react'
import { useRef, useState } from 'react'
import { useToast } from '@/components/ui/Toaster'
import type { UploadResult } from '@/hooks/storage/useS3Upload'
import {
  extractVideoPoster,
  PRODUCT_VIDEO_ACCEPT,
  PRODUCT_VIDEO_MAX_COUNT,
  productVideoUrl,
  uploadProductVideo,
  uploadVideoPoster,
  type VideoPoster,
  validateProductVideo,
} from '@/utils/product-video-upload'

/** A video queued for creation plus the poster extracted for it. */
export interface ProductVideoUpload {
  video: UploadResult
  poster: VideoPoster | null
}

interface Props {
  data: { videos: ProductVideoUpload[] }
  onChange: (data: { videos: ProductVideoUpload[] }) => void
  uploadPrefix: string
}

interface PendingUpload {
  id: string
  name: string
  progress: number
  stage: 'video' | 'poster'
}

function formatSize(bytes: number | undefined): string {
  if (!bytes) return '—'

  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function posterSrc(poster: VideoPoster | null): string | undefined {
  const key = poster?.variants.medium ?? poster?.variants.small ?? poster?.key
  return key ? productVideoUrl(key) : undefined
}

/**
 * Create-flow video step: the clip and its poster are pushed to object storage
 * immediately but only registered in the DAM once the product exists (see
 * AddProductModal).
 */
export function ProductVideosStep({ data, onChange, uploadPrefix }: Props) {
  const { error: showError } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const dataRef = useRef(data.videos)
  dataRef.current = data.videos
  const [pending, setPending] = useState<PendingUpload[]>([])

  const trackPending = (entry: PendingUpload) => setPending((prev) => [...prev, entry])
  const updatePending = (id: string, patch: Partial<PendingUpload>) =>
    setPending((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  const clearPending = (id: string) => setPending((prev) => prev.filter((e) => e.id !== id))

  async function uploadFile(file: File, index: number) {
    const id = `video-${Date.now()}-${index}`
    trackPending({ id, name: file.name, progress: 0, stage: 'video' })

    try {
      const directory = `${uploadPrefix}/videos`
      const video = await uploadProductVideo(file, directory, (percent) =>
        updatePending(id, { progress: percent })
      )

      updatePending(id, { stage: 'poster', progress: 100 })
      const frame = await extractVideoPoster(file)
      const poster = frame ? await uploadVideoPoster(frame, `${directory}/posters`) : null

      onChange({ videos: [...dataRef.current, { video, poster }] })
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

    const remaining = PRODUCT_VIDEO_MAX_COUNT - data.videos.length - pending.length
    if (accepted.length > remaining) {
      showError(`Up to ${PRODUCT_VIDEO_MAX_COUNT} videos per product (${remaining} slots left)`)
      return
    }

    // Upload sequentially so each result is merged into the latest list.
    void (async () => {
      for (const [index, file] of accepted.entries()) {
        await uploadFile(file, index)
      }
    })()
  }

  const removeVideo = (key: string) => {
    onChange({ videos: data.videos.filter((entry) => entry.video.key !== key) })
  }

  const slotsLeft = PRODUCT_VIDEO_MAX_COUNT - data.videos.length - pending.length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
          <Film className="h-5 w-5 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Product Videos</h2>
          <p className="text-gray-500 text-sm dark:text-gray-400">
            MP4, WebM or MOV &middot; Max 100MB &middot; Up to {PRODUCT_VIDEO_MAX_COUNT} videos
            (optional)
          </p>
        </div>
      </div>

      {data.videos.length === 0 && pending.length === 0 ? (
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
          {data.videos.map((entry) => (
            <div
              key={entry.video.key}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-gray-700"
            >
              <video
                src={productVideoUrl(entry.video.key)}
                poster={posterSrc(entry.poster)}
                preload="metadata"
                muted
                playsInline
                className="aspect-video w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white text-xs">
                    {entry.video.original_filename}
                  </p>
                  <p className="text-[10px] text-gray-300">
                    {formatSize(entry.video.metadata?.size)} &middot;{' '}
                    {entry.video.metadata?.content_type ?? 'video'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {entry.poster && (
                    <span
                      title="Thumbnail captured"
                      className="rounded-full bg-white/20 p-1.5 text-white"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeVideo(entry.video.key)}
                    title="Remove video"
                    className="rounded-full bg-white/90 p-1.5 text-red-600 hover:bg-white"
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

      {slotsLeft > 0 && data.videos.length + pending.length > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 text-xs hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Upload className="h-3.5 w-3.5" /> Add another video
        </button>
      )}

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
    </div>
  )
}
