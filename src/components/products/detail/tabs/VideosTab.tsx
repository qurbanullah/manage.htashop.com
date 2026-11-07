import { ProductVideosPanel } from '@/components/products/videos/ProductVideosPanel'

interface Props {
  product: { id: number; uuid: string }
}

/**
 * Product detail "Videos" tab — the upload/delete UI lives in
 * `ProductVideosPanel` so the edit modal and this tab stay in sync.
 */
export function VideosTab({ product }: Props) {
  return <ProductVideosPanel product={product} />
}
