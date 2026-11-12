import { type ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'

interface ImageDropzoneProps {
  onFiles: (files: FileList) => void
  children: ReactNode
  className?: string
  /** Classes applied while a file is hovering the zone. */
  activeClassName?: string
  disabled?: boolean
}

/**
 * Drop target for product images.
 *
 * This is a container rather than a `<button>`: buttons do not accept file
 * drops reliably across browsers, and the zone must stay droppable while it is
 * already showing an image (to replace it). The children keep the click and
 * keyboard affordances.
 */
export function ImageDropzone({
  onFiles,
  children,
  className,
  activeClassName,
  disabled = false,
}: ImageDropzoneProps) {
  const [dragging, setDragging] = useState(false)

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the interactive controls are the children; this only widens their drop target
    <div
      onDragEnter={(event) => {
        if (disabled) return

        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => {
        if (disabled) return

        // Without preventDefault the browser refuses the drop entirely.
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)

        if (!disabled && event.dataTransfer.files.length > 0) {
          onFiles(event.dataTransfer.files)
        }
      }}
      className={cn(className, dragging && !disabled && activeClassName)}
    >
      {children}
    </div>
  )
}
