import { cn } from '@/lib/utils'

interface RichTextContentProps {
  html: string | null | undefined
  className?: string
}

/** Editor output always starts with at least one element; plain text never does. */
function hasMarkup(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value)
}

/**
 * Read-only renderer for product description HTML.
 *
 * The API purifies every stored fragment against HTMLPurifier's allowlist on
 * write (`App\Support\Html\RichText`), so this is a presentation component, not
 * a security boundary. Descriptions written before the rich-text editor — plain
 * text with newlines — keep their line breaks.
 */
export function RichTextContent({ html, className }: RichTextContentProps) {
  const value = html?.trim() ?? ''

  if (value === '') {
    return null
  }

  if (!hasMarkup(value)) {
    return <p className={cn('whitespace-pre-line', className)}>{value}</p>
  }

  return (
    <div
      className={cn(
        'text-gray-700 text-sm dark:text-gray-300',
        '[&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400',
        '[&_blockquote]:border-gray-300 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic dark:[&_blockquote]:border-gray-600',
        '[&_h2]:mt-3 [&_h2]:font-bold [&_h2]:text-lg',
        '[&_h3]:mt-3 [&_h3]:font-semibold [&_h3]:text-base',
        '[&_h4]:mt-2 [&_h4]:font-semibold',
        '[&_hr]:my-3',
        '[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg',
        '[&_li]:ml-4',
        '[&_ol]:list-decimal',
        '[&_p]:my-1',
        '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:text-xs dark:[&_pre]:bg-gray-800',
        '[&_strong]:font-semibold',
        '[&_ul]:list-disc',
        className
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: the API purifies this HTML on write
      dangerouslySetInnerHTML={{ __html: value }}
    />
  )
}
