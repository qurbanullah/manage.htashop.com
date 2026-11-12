import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageDropzone } from './ImageDropzone'

function imageFile(name = 'photo.jpg'): File {
  return new File(['bytes'], name, { type: 'image/jpeg' })
}

describe('ImageDropzone', () => {
  it('hands dropped files to the caller', () => {
    const onFiles = vi.fn()
    render(
      <ImageDropzone onFiles={onFiles}>
        <span>drop area</span>
      </ImageDropzone>
    )

    const zone = screen.getByText('drop area').parentElement as HTMLElement
    const file = imageFile()

    fireEvent.drop(zone, { dataTransfer: { files: [file] } })

    const files = (onFiles.mock.calls[0] ?? [])[0] as FileList

    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(files[0]).toBe(file)
  })

  it('ignores drops while disabled', () => {
    const onFiles = vi.fn()
    render(
      <ImageDropzone onFiles={onFiles} disabled>
        <span>drop area</span>
      </ImageDropzone>
    )

    fireEvent.drop(screen.getByText('drop area').parentElement as HTMLElement, {
      dataTransfer: { files: [imageFile()] },
    })

    expect(onFiles).not.toHaveBeenCalled()
  })

  it('applies the active classes only while a file hovers the zone', () => {
    render(
      <ImageDropzone onFiles={vi.fn()} className="base" activeClassName="is-active">
        <span>drop area</span>
      </ImageDropzone>
    )

    const zone = screen.getByText('drop area').parentElement as HTMLElement

    expect(zone.className).toContain('base')
    expect(zone.className).not.toContain('is-active')

    fireEvent.dragOver(zone, { dataTransfer: { files: [imageFile()], types: ['Files'] } })

    expect(zone.className).toContain('is-active')

    fireEvent.drop(zone, { dataTransfer: { files: [imageFile()] } })

    expect(zone.className).not.toContain('is-active')
  })
})
