import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Palette,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/Toaster'
import { cn } from '@/lib/utils'
import {
  PRODUCT_IMAGE_ACCEPT,
  productImageUrl,
  uploadProductImage,
  validateProductImage,
} from '@/utils/product-image-upload'

interface Props {
  value: string
  onChange: (html: string) => void
  /** Upload directory, e.g. `products/{uuid}`. */
  uploadPrefix: string
  placeholder?: string
}

const EDITOR_CLASS = [
  'min-h-40 max-w-none px-3 py-2 text-sm text-gray-700 focus:outline-none dark:text-gray-200',
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
].join(' ')

/** Legacy descriptions are plain text; turn them into paragraphs for editing. */
function toEditorContent(value: string): string {
  if (!value.trim()) return ''
  if (/<\/?[a-z][^>]*>/i.test(value)) return value

  const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/**
 * Rich text editor for product descriptions.
 *
 * Output is HTML. It is always re-sanitised server-side on save, so this
 * component only shapes the authoring experience — it is not a security
 * boundary.
 */
export function RichTextEditor({ value, onChange, uploadPrefix, placeholder }: Props) {
  const { error: showError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ImageExtension.configure({ allowBase64: false }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Describe the product, add images and formatting…',
      }),
    ],
    content: toEditorContent(value),
    editorProps: { attributes: { class: EDITOR_CLASS } },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  })

  useEffect(() => {
    if (!editor) return

    const next = toEditorContent(value)

    if (next === editor.getHTML()) return

    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  const handleImage = async (file: File) => {
    const invalid = validateProductImage(file)

    if (invalid) {
      showError(invalid)
      return
    }

    setUploading(true)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const result = await uploadProductImage(
        file,
        `${uploadPrefix}/description/${unique}.${extension}`
      )

      editor
        ?.chain()
        .focus()
        .setImage({ src: productImageUrl(result.key), alt: file.name })
        .run()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not upload the image')
    } finally {
      setUploading(false)
    }
  }

  const setLink = () => {
    if (!editor) return

    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')

    if (url === null) return

    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  if (!editor) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
      <div className="flex flex-wrap items-center gap-0.5 border-gray-200 border-b bg-gray-50 p-1.5 dark:border-gray-700 dark:bg-gray-900/40">
        <ToolButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolButton>

        <Divider />

        <ToolButton
          label="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <span className="font-bold text-xs">H2</span>
        </ToolButton>
        <ToolButton
          label="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <span className="font-bold text-xs">H3</span>
        </ToolButton>

        <Divider />

        <ToolButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Quote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Code block"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="h-4 w-4" />
        </ToolButton>

        <Divider />

        <ToolButton
          label="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Align centre"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToolButton>

        <Divider />

        <ToolButton label="Link" active={editor.isActive('link')} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Highlight"
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
        >
          <Highlighter className="h-4 w-4" />
        </ToolButton>

        <label
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          title="Text colour"
        >
          <Palette className="h-4 w-4" />
          <input
            type="color"
            aria-label="Text colour"
            className="sr-only"
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
          />
        </label>

        <ToolButton
          label="Add image"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
        </ToolButton>

        <Divider />

        <ToolButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Clear formatting"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <Eraser className="h-4 w-4" />
        </ToolButton>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept={PRODUCT_IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''

          if (file) void handleImage(file)
        }}
      />
    </div>
  )
}

interface ToolButtonProps {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the editor selection when the toolbar is clicked.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700',
        active && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
}
