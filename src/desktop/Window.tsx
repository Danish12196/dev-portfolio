import { useRef, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { useWindows, type Win } from '../store/windows'

type Edge = 'move' | 'e' | 's' | 'se' | 'w' | 'sw'

export default function Window({ win, active, children }: { win: Win; active: boolean; children: ReactNode }) {
  const { focus, close, minimize, toggleMaximize, setBounds } = useWindows()
  const drag = useRef<{ edge: Edge; sx: number; sy: number; x: number; y: number; w: number; h: number } | null>(null)

  function start(edge: Edge) {
    return (e: RPointerEvent) => {
      if (win.maximized || e.button !== 0) return
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      drag.current = { edge, sx: e.clientX, sy: e.clientY, x: win.x, y: win.y, w: win.w, h: win.h }
      focus(win.id)
    }
  }

  function move(e: RPointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    const minW = 320
    const minH = 200
    if (d.edge === 'move') {
      const maxX = window.innerWidth - 80
      const maxY = window.innerHeight - 54 - 60
      return setBounds(win.id, { x: Math.min(maxX, Math.max(-d.w + 80, d.x + dx)), y: Math.min(maxY, Math.max(0, d.y + dy)) })
    }
    const b: Partial<Win> = {}
    if (d.edge.includes('e')) b.w = Math.max(minW, d.w + dx)
    if (d.edge.includes('s')) b.h = Math.max(minH, d.h + dy)
    if (d.edge.includes('w')) {
      const w = Math.max(minW, d.w - dx)
      b.w = w
      b.x = d.x + (d.w - w)
    }
    setBounds(win.id, b)
  }

  const end = () => (drag.current = null)
  const handle = (edge: Edge) => ({ onPointerDown: start(edge), onPointerMove: move, onPointerUp: end, onPointerCancel: end })

  const style = win.maximized
    ? { zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  return (
    <section
      className={`win${active ? ' active' : ''}${win.maximized ? ' max' : ''} win-${win.kind}`}
      style={{ ...style, ['--win-color' as string]: win.color }}
      onPointerDown={() => focus(win.id)}
      aria-label={win.title}
      hidden={win.minimized}
    >
      <header className="win-bar" {...handle('move')} onDoubleClick={() => toggleMaximize(win.id)}>
        <span className={`win-glyph win-glyph-${win.kind}`} aria-hidden="true" />
        <span className="win-title">{win.title}</span>
        <div className="win-buttons">
          <button type="button" className="b-min" onClick={() => minimize(win.id)} aria-label={`Minimise ${win.title}`} title="Minimise">
            –
          </button>
          <button type="button" className="b-max" onClick={() => toggleMaximize(win.id)} aria-label={`Maximise ${win.title}`} title="Maximise">
            +
          </button>
          <button type="button" className="b-close" onClick={() => close(win.id)} aria-label={`Close ${win.title}`} title="Close">
            ×
          </button>
        </div>
      </header>
      <div className="win-body">{children}</div>
      {!win.maximized && (
        <>
          <div className="rz rz-e" {...handle('e')} />
          <div className="rz rz-w" {...handle('w')} />
          <div className="rz rz-s" {...handle('s')} />
          <div className="rz rz-se" {...handle('se')} />
          <div className="rz rz-sw" {...handle('sw')} />
        </>
      )}
    </section>
  )
}
