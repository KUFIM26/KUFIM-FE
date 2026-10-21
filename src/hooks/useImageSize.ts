import { useEffect, useState } from 'react'

export type ImageSize = { width: number; height: number }

const cache = new Map<string, Promise<ImageSize | null>>()
const positive = (value: number) => Number.isFinite(value) && value > 0

// SVGs exported without width/height only describe their size in viewBox,
// which <img> naturalWidth does not report reliably across browsers.
async function svgSize(url: string): Promise<ImageSize | null> {
  const response = await fetch(url)
  if (!response.ok) return null
  const root = new DOMParser().parseFromString(
    await response.text(),
    'image/svg+xml',
  ).documentElement
  const box = root
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  if (box?.length === 4 && positive(box[2]) && positive(box[3]))
    return { width: box[2], height: box[3] }
  const width = parseFloat(root.getAttribute('width') ?? ''),
    height = parseFloat(root.getAttribute('height') ?? '')
  return positive(width) && positive(height) ? { width, height } : null
}

function bitmapSize(url: string) {
  return new Promise<ImageSize | null>((resolve) => {
    const image = new Image()
    image.onload = () =>
      resolve(
        positive(image.naturalWidth) && positive(image.naturalHeight)
          ? { width: image.naturalWidth, height: image.naturalHeight }
          : null,
      )
    image.onerror = () => resolve(null)
    image.src = url
  })
}

function measure(url: string) {
  let size = cache.get(url)
  if (!size) {
    size = (
      /\.svg([?#]|$)/i.test(url) ? svgSize(url).catch(() => null) : Promise.resolve(null)
    ).then((svg) => svg ?? bitmapSize(url))
    cache.set(url, size)
  }
  return size
}

/** The image file's own proportions, falling back to the stored floorplan size. */
export function useImageSize(url: string | undefined, fallback: ImageSize | null) {
  const [measured, setMeasured] = useState<{ url: string; size: ImageSize | null } | null>(null)
  useEffect(() => {
    if (!url) return
    let active = true
    void measure(url).then((size) => {
      if (active) setMeasured({ url, size })
    })
    return () => {
      active = false
    }
  }, [url])
  if (!url || measured?.url !== url) return null
  return measured.size ?? fallback
}
