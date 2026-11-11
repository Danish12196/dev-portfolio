import { createElement, useCallback, useEffect, useRef, useState, type HTMLAttributes, type PointerEvent as RPointerEvent } from 'react'
import { useLayout, type Offset } from '../store/layout'

/** A press only becomes a drag after moving this far, so clicks, taps and double-clicks still work. */
const SLOP = 6
const ZERO: Offset = { x: 0, y: 0 }

/** The area a thing can be dragged around in: the screen, minus the taskbar (or, for phone home screen icons, the dock). */
function bounds(el: HTMLElement) {
  const bar = (el.closest('.ph-home')?.querySelector('.ph-dock') ?? document.querySelector('.taskbar'))?.getBoundingClientRect()
  return { left: 0, top: 0, right: window.innerWidth, bottom: bar ? bar.top : window.innerHeight }
}

/** Limit a move so a box (given where it sits with no move applied) stays fully inside the area. */
function clamp(el: HTMLElement, o: Offset, home: { left: number; top: number; right: number; bottom: number }): Offset {
  const b = bounds(el)
  // If the box is bigger than the area, keep its top left corner in view.
  const maxX = Math.max(b.left - home.left, b.right - home.right)
  const maxY = Math.max(b.top - home.top, b.bottom - home.bottom)
  return { x: Math.min(maxX, Math.max(b.left - home.left, o.x)), y: Math.min(maxY, Math.max(b.top - home.top, o.y)) }
}

/** After a drag, the browser still fires a click on whatever was under the pointer. Swallow that one. */
function swallowNextClick() {
  const stop = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }
  window.addEventListener('click', stop, { capture: true, once: true })
  setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
}

interface Props extends HTMLAttributes<HTMLElement> {
  /** Stable name the position is saved under. */
  id: string
  as?: 'div' | 'aside' | 'li' | 'button'
  /** Selector for the part that starts a drag. Without it, the whole thing does. */
  handle?: string
  /** Only allow moving up and down. */
  axis?: 'y'
  /** Among its siblings, the one moved last goes on top (icons that can be dropped onto each other). */
  stack?: boolean
  type?: 'button'
}

/**
 * Wraps anything on the desktop so it can be dragged with a mouse, finger or pen.
 * It stays in its normal layout and is shifted with `translate`, which leaves any `transform` (tilt, animations) alone.
 * The position is remembered between visits.
 */
export default function Draggable({ id, as = 'div', handle, axis, stack, className = '', style, children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null)
  const saved = useLayout((s) => s.offsets[id]) ?? ZERO
  const setOffset = useLayout((s) => s.setOffset)
  const [live, setLive] = useState<Offset | null>(null)
  const stopDrag = useRef<(() => void) | null>(null)
  const at = live ?? saved

  /** Pull it back on screen if the saved spot no longer fits (smaller window, rotated phone). */
  const refit = useCallback(() => {
    const el = ref.current
    const o = useLayout.getState().offsets[id]
    if (!el || !o) return
    const r = el.getBoundingClientRect()
    if (!r.width && !r.height) return
    const next = clamp(el, o, { left: r.left - o.x, top: r.top - o.y, right: r.right - o.x, bottom: r.bottom - o.y })
    if (next.x !== o.x || next.y !== o.y) setOffset(id, next, true)
  }, [id, setOffset])

  useEffect(() => {
    // Wait for entrance animations to finish before measuring.
    const t = setTimeout(refit, 400)
    window.addEventListener('resize', refit)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', refit)
      stopDrag.current?.()
    }
  }, [refit])

  function onPointerDown(e: RPointerEvent<HTMLElement>) {
    rest.onPointerDown?.(e)
    const el = ref.current
    if (!el || e.button !== 0 || !e.isPrimary || stopDrag.current) return
    const target = e.target as HTMLElement
    if (handle ? !target.closest(handle) : target.closest('input, textarea, select')) return
    // In a handle, buttons (like the fold button) stay plain buttons.
    if (handle && target.closest('button, a')) return

    const start = useLayout.getState().offsets[id] ?? ZERO
    const r = el.getBoundingClientRect()
    const home = { left: r.left - start.x, top: r.top - start.y, right: r.right - start.x, bottom: r.bottom - start.y }
    const sx = e.clientX
    const sy = e.clientY
    const pointer = e.pointerId
    let moved = false
    let latest = start

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return
      const dx = axis === 'y' ? 0 : ev.clientX - sx
      const dy = ev.clientY - sy
      if (!moved && Math.hypot(dx, dy) < SLOP) return
      moved = true
      ev.preventDefault()
      latest = clamp(el, { x: start.x + dx, y: start.y + dy }, home)
      setLive(latest)
    }
    const finish = (ev?: PointerEvent) => {
      if (ev && ev.pointerId !== pointer) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      stopDrag.current = null
      if (!moved) return
      setOffset(id, latest)
      setLive(null)
      if (ev?.type === 'pointerup') swallowNextClick()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    stopDrag.current = () => finish()
  }

  return createElement(
    as,
    {
      ...rest,
      ref,
      'data-drag': handle ? 'handle' : 'all',
      className: `${className}${live ? ' dragging' : ''}`.trim(),
      style: at.x || at.y ? { ...style, translate: `${at.x}px ${at.y}px`, ...(stack && { zIndex: live ? 99999 : saved.z }) } : style,
      onPointerDown,
      // Stop the browser's own image and link dragging from taking over.
      onDragStart: (e: React.DragEvent) => e.preventDefault(),
    },
    children,
  )
}
