import { storageApi } from '@/api/storage'
import type { UploadResult } from '@/hooks/storage/useS3Upload'
import { generateImageVariants } from '@/utils/image-resize'

export const PRODUCT_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp'
export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PRODUCT_IMAGE_MAX_SIZE = 10 * 1024 * 1024
export const PRODUCT_IMAGE_MAX_GALLERY = 8
export const PRODUCT_IMAGE_CDN_BASE = 'https://cdn.htashop.com'

/** Returns a user-facing error message, or null when the file is acceptable. */
export function validateProductImage(file: File): string | null {
  if (!PRODUCT_IMAGE_TYPES.includes(file.type)) return 'JPEG, PNG, or WebP only'
  if (file.size > PRODUCT_IMAGE_MAX_SIZE) return 'Max 10MB per image'
  return null
}

/** Absolute CDN URL for a stored object key (passes through absolute URLs). */
export function productImageUrl(key: string): string {
  return key.startsWith('http') ? key : `${PRODUCT_IMAGE_CDN_BASE}/${key.replace(/^\/+/, '')}`
}

/**
 * Upload a product image and its resized variants to object storage.
 *
 * `key` is the target object key, e.g. `products/{uuid}/images/featured.jpg`.
 */
export async function uploadProductImage(file: File, key: string): Promise<UploadResult> {
  const lastSlash = key.lastIndexOf('/')
  const directory = key.slice(0, lastSlash)
  const baseFilename = key.slice(lastSlash + 1).replace(/\.[^.]+$/, '')
  const ext = key.split('.').pop() || 'jpg'

  // Generate resized variants client-side (original + large/medium/small/thumb)
  const variants = await generateImageVariants(file)

  const uploadedVariants: Record<string, string> = {}
  let originalKey = ''

  for (const [suffix, blob] of Object.entries(variants)) {
    const filename =
      suffix === 'original' ? `${baseFilename}.${ext}` : `${baseFilename}-${suffix}.jpg`

    const presigned = await storageApi.getPresignedUrl(filename, 'image/jpeg', directory, blob.size)
    if (!presigned.success || !presigned.data?.url) throw new Error('Failed to get upload URL')

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', presigned.data?.url ?? '', true)
      xhr.setRequestHeader('Content-Type', 'image/jpeg')
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Upload failed: ${xhr.status}`))
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.send(blob)
    })

    uploadedVariants[suffix] = presigned.data.key
    if (suffix === 'original') originalKey = presigned.data.key
  }

  return {
    key: originalKey,
    original_filename: file.name,
    metadata: {
      size: file.size,
      content_type: file.type,
      last_modified: new Date().toISOString(),
      etag: '',
    },
    variants: uploadedVariants,
  }
}
