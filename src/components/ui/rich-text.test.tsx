import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RichTextContent } from './rich-text'

describe('RichTextContent', () => {
  it('renders editor HTML as markup instead of escaped text', () => {
    const { container } = render(
      <RichTextContent html="<p>Hello <strong>world</strong></p><ul><li>One</li><li>Two</li></ul>" />
    )

    expect(container.querySelector('p')).not.toBeNull()
    expect(container.querySelector('strong')?.textContent).toBe('world')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.textContent).not.toContain('<p>')
  })

  it('keeps the line breaks of legacy plain-text descriptions', () => {
    const { container } = render(<RichTextContent html={'Line one\n\nLine two'} />)

    expect(container.querySelector('p')?.className).toContain('whitespace-pre-line')
    expect(container.textContent).toContain('Line two')
  })

  it('renders nothing for a blank description', () => {
    const { container } = render(<RichTextContent html="   " />)

    expect(container.firstChild).toBeNull()
  })
})
