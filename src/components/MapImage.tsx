import { useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { useFestival } from '../app/festival-context'
import type { Floorplan } from '../apis/type'
import type { Booth } from '../data/models'

type Point = { x: number; y: number }
type View = Point & { scale: number }
type Props = {
  className?: string
  variant?: 'map' | 'mini' | 'picker'
  markers?: Booth[]
  selectedPoint?: Point | null
  onSelect?: (point: Point) => void
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

export function MapImage({ className = '', variant = 'map', ...props }: Props) {
  const { floorplan } = useFestival()
  if (!floorplan)
    return (
      <div
        className={`flex items-center justify-center bg-[#e8eee9] p-5 text-sm text-muted ${className}`}
      >
        등록된 지도가 없습니다.
      </div>
    )
  if (variant === 'mini')
    return (
      <div
        className={`relative overflow-hidden bg-white ${className}`}
        data-map-variant={variant}
        style={{ aspectRatio: `${floorplan.width}/${floorplan.height}` }}
      >
        <img
          src={floorplan.imageUrl}
          alt="축제 지도"
          draggable={false}
          className="block h-full w-full object-contain"
        />
      </div>
    )
  return (
    <MapCanvas
      key={`${floorplan.imageUrl}:${floorplan.width}:${floorplan.height}`}
      floorplan={floorplan}
      variant={variant}
      className={className}
      {...props}
    />
  )
}

function MapCanvas({
  floorplan,
  className,
  variant,
  markers = [],
  selectedPoint,
  onSelect,
}: Props & { floorplan: Floorplan }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 })
  const current = useRef(view)
  const pointers = useRef(new Map<number, Point>())
  const moved = useRef(false)
  const gesture = useRef<{ view: View; center: Point; distance: number } | null>(null)
  const geometry = () => {
    const box = viewport.current!.getBoundingClientRect()
    const fit = Math.min(box.width / floorplan.width, box.height / floorplan.height)
    return { box, width: floorplan.width * fit, height: floorplan.height * fit }
  }
  const apply = (next: View) => {
    const { box, width, height } = geometry()
    const w = width * next.scale,
      h = height * next.scale
    current.current = {
      scale: next.scale,
      x: w <= box.width ? (box.width - w) / 2 : clamp(next.x, box.width - w, 0),
      y: h <= box.height ? (box.height - h) / 2 : clamp(next.y, box.height - h, 0),
    }
    setView(current.current)
  }
  const reset = () => {
    pointers.current.clear()
    gesture.current = null
    apply({ x: 0, y: 0, scale: 1 })
  }
  const zoom = (factor: number, anchor?: Point) => {
    const { box } = geometry()
    const point = anchor ?? { x: box.width / 2, y: box.height / 2 }
    const before = current.current,
      scale = clamp(before.scale * factor, 1, 5)
    apply({
      scale,
      x: point.x - ((point.x - before.x) * scale) / before.scale,
      y: point.y - ((point.y - before.y) * scale) / before.scale,
    })
  }
  useLayoutEffect(() => {
    const element = viewport.current!
    const observer = new ResizeObserver(reset)
    observer.observe(element)
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = element.getBoundingClientRect()
      zoom(Math.exp(-clamp(event.deltaY, -100, 100) * 0.005), {
        x: event.clientX - box.left,
        y: event.clientY - box.top,
      })
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => {
      observer.disconnect()
      element.removeEventListener('wheel', wheel)
    }
    // This canvas remounts when its floorplan changes; gesture handlers read refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const pointFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const box = viewport.current!.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }
  const beginGesture = () => {
    const points = [...pointers.current.values()]
    gesture.current = points.length
      ? {
          view: current.current,
          center: points.length > 1 ? midpoint(points[0], points[1]) : points[0],
          distance: points.length > 1 ? distance(points[0], points[1]) : 0,
        }
      : null
  }
  const finishPointer = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    if (!pointers.current.has(event.pointerId)) return
    if (!cancelled && !moved.current && pointers.current.size === 1 && onSelect) {
      const point = pointFromEvent(event),
        { width, height } = geometry(),
        v = current.current
      const x = ((point.x - v.x) / (width * v.scale)) * 100
      const y = ((point.y - v.y) / (height * v.scale)) * 100
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) onSelect({ x, y })
    }
    pointers.current.delete(event.pointerId)
    beginGesture()
  }
  const size = viewport.current ? geometry() : { width: 0, height: 0 }
  return (
    <div
      className={`relative overflow-hidden bg-[#f4f7f1] ${className}`}
      data-map-variant={variant}
    >
      <div
        ref={viewport}
        role="region"
        aria-label={onSelect ? '지도에서 위치 선택' : '확대 가능한 축제 지도'}
        tabIndex={0}
        className={`absolute inset-0 touch-none select-none outline-offset-[-3px] ${variant === 'map' ? 'bottom-[132px]' : ''}`}
        style={{ cursor: onSelect ? 'crosshair' : 'grab' }}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return
          if (!pointers.current.size) moved.current = false
          pointers.current.set(event.pointerId, pointFromEvent(event))
          if (pointers.current.size > 1) moved.current = true
          ;(event.target as Element).setPointerCapture(event.pointerId)
          beginGesture()
        }}
        onPointerMove={(event) => {
          if (!pointers.current.has(event.pointerId) || !gesture.current) return
          pointers.current.set(event.pointerId, pointFromEvent(event))
          const points = [...pointers.current.values()],
            start = gesture.current
          const center = points.length > 1 ? midpoint(points[0], points[1]) : points[0]
          if (distance(center, start.center) > 4) moved.current = true
          if (!moved.current) return
          const scale =
            points.length > 1 && start.distance > 0
              ? clamp((start.view.scale * distance(points[0], points[1])) / start.distance, 1, 5)
              : start.view.scale
          apply({
            scale,
            x: center.x - ((start.center.x - start.view.x) * scale) / start.view.scale,
            y: center.y - ((start.center.y - start.view.y) * scale) / start.view.scale,
          })
        }}
        onPointerUp={(event) => finishPointer(event)}
        onPointerCancel={(event) => finishPointer(event, true)}
        onLostPointerCapture={(event) => finishPointer(event, true)}
        onClickCapture={(event) => {
          if (moved.current && event.detail > 0) {
            event.preventDefault()
            event.stopPropagation()
          }
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          const directions: Record<string, Point> = {
            ArrowLeft: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 },
            ArrowUp: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 },
          }
          const direction = directions[event.key]
          if (direction) {
            event.preventDefault()
            if (onSelect)
              onSelect({
                x: clamp((selectedPoint?.x ?? 50) + direction.x * 2, 0, 100),
                y: clamp((selectedPoint?.y ?? 50) + direction.y * 2, 0, 100),
              })
            else
              apply({
                ...current.current,
                x: current.current.x - direction.x * 40,
                y: current.current.y - direction.y * 40,
              })
          } else if (['+', '=', '-', 'Home'].includes(event.key)) {
            event.preventDefault()
            if (event.key === 'Home') reset()
            else zoom(event.key === '-' ? 1 / 1.4 : 1.4)
          }
        }}
      >
        <div
          className="absolute top-0 left-0"
          data-map-content
          style={{
            width: size.width * view.scale,
            height: size.height * view.scale,
            transform: `translate(${view.x}px, ${view.y}px)`,
          }}
        >
          <img
            src={floorplan.imageUrl}
            alt="축제 지도"
            draggable={false}
            className="block h-full w-full pointer-events-none"
          />
          {markers
            .filter((b) => b.position)
            .map((b) => (
              <div
                key={b.id}
                className="absolute"
                style={{ left: `${b.position!.x}%`, top: `${b.position!.y}%` }}
              >
                <Link
                  to={`/booths/${b.id}`}
                  draggable={false}
                  aria-label={`${b.name} 위치`}
                  className="absolute bottom-0 left-0 w-max -translate-x-1/2 rounded bg-brand px-2 py-1 text-xs font-bold text-white shadow"
                >
                  {b.name}
                </Link>
              </div>
            ))}
          {selectedPoint && (
            <span
              aria-label="선택한 위치"
              className="absolute"
              style={{ left: `${selectedPoint.x}%`, top: `${selectedPoint.y}%` }}
            >
              <span className="absolute -translate-x-1/2 -translate-y-full text-brand">
                <span className="block size-5 rounded-full border-[5px] border-white bg-brand shadow" />
                <span className="mx-auto block size-2 rotate-45 bg-brand -mt-1" />
              </span>
            </span>
          )}
        </div>
      </div>
      <div
        role="group"
        aria-label="지도 확대 및 축소"
        className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-xl bg-white text-brand shadow-card"
      >
        <button
          type="button"
          aria-label="지도 확대"
          disabled={view.scale >= 5}
          onClick={() => zoom(1.4)}
          className="size-10 text-2xl font-semibold disabled:text-gray-300"
        >
          +
        </button>
        <button
          type="button"
          aria-label="지도 전체 보기"
          onClick={reset}
          className="h-9 min-w-10 border-y border-gray-100 px-1 text-[11px] font-semibold"
        >
          {Math.round(view.scale * 100)}%
        </button>
        <button
          type="button"
          aria-label="지도 축소"
          disabled={view.scale <= 1}
          onClick={() => zoom(1 / 1.4)}
          className="size-10 text-2xl font-semibold disabled:text-gray-300"
        >
          −
        </button>
      </div>
    </div>
  )
}
