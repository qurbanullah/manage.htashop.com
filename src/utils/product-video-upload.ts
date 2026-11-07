import { storageApi } from '@/api/storage'
import type { UploadResult } from '@/hooks/storage/useS3Upload'
import { uploadProductImage } from '@/utils/product-image-upload'

export const PRODUCT_VIDEO_ACCEPT = '.mp4,.webm,.mov'
export const PRODUCT_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const PRODUCT_VIDEO_MAX_SIZE = 100 * 1024 * 1024
export const PRODUCT_VIDEO_MAX_COUNT = 3
export const PRODUCT_VIDEO_CDN_BASE = 'https://cdn.htashop.com'

/** Returns a user-facing error message, or null when the file is acceptable. */
export function validateProductVideo(file: File): string | null {
  if (!PRODUCT_VIDEO_TYPES.includes(file.type)) return 'MP4, WebM, or MOV only'
  if (file.size > PRODUCT_VIDEO_MAX_SIZE) return 'Max 100MB per video'
  return null
}

/** Absolute CDN URL for a stored object key (passes through absolute URLs). */
export function productVideoUrl(key: string): string {
  return key.startsWith('http') ? key : `${PRODUCT_VIDEO_CDN_BASE}/${key.replace(/^\/+/, '')}`
}

/**
 * Upload a product video straight to object storage.
 *
 * Unlike images there is no resizing step — the original file is stored as-is
 * so the CDN can stream it with range requests.
 */
export async function uploadProductVideo(
  file: File,
  directory: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const contentType = file.type || 'video/mp4'
  const presigned = await storageApi.getPresignedUrl(file.name, contentType, directory, file.size)

  if (!presigned.success || !presigned.data?.url) {
    throw new Error(presigned.message || 'Failed to get upload URL')
  }

  const uploadUrl = presigned.data.url

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', contentType)

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed: ${xhr.status}`))
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })

  return {
    key: presigned.data.key,
    original_filename: file.name,
    metadata: {
      size: file.size,
      content_type: contentType,
      last_modified: new Date().toISOString(),
      etag: '',
    },
  }
}

/** Uploaded poster image: original key plus its resized variant keys. */
export interface VideoPoster {
  key: string
  variants: Record<string, string>
}

/**
 * Grab a frame from the video in the browser and return it as a JPEG file.
 *
 * Seeking to ~10% of the duration avoids black leader frames; the extraction
 * fails soft (returns null) so an upload never depends on canvas support.
 */
export async function extractVideoPoster(file: File, seconds?: number): Promise<File | null> {
  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')

  try {
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('Could not read the video'))
    })

    const duration = Number.isFinite(video.duration) ? video.duration : 0
    const target = seconds ?? (duration > 1 ? Math.min(duration * 0.1, 3) : 0.1)

    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve()
      video.onerror = () => reject(new Error('Could not seek the video'))
      video.currentTime = Math.max(0, Math.min(target, Math.max(duration - 0.1, 0.1)))
    })

    if (!video.videoWidth || !video.videoHeight) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) return null

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.85)
    )

    if (!blob) return null

    return new File([blob], `poster-${Date.now()}.jpg`, { type: 'image/jpeg' })
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(objectUrl)
    video.removeAttribute('src')
  }
}

/** Upload a poster image (extracted or manually picked) with its resized variants. */
export async function uploadVideoPoster(file: File, directory: string): Promise<VideoPoster> {
  const key = `${directory}/poster-${Date.now()}.jpg`
  const upload = await uploadProductImage(file, key)

  return { key: upload.key, variants: upload.variants ?? {} }
}

/** DAM metadata payload describing the poster for a video asset. */
export function videoPosterMetadata(poster: VideoPoster | null): Record<string, unknown> {
  return poster ? { poster_key: poster.key, poster_variants: poster.variants } : {}
}
