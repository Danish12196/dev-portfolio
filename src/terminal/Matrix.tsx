import { useEffect, useRef } from 'react'
import { txt, type Line } from './lines'

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789DANISH'
const SIZE = 16

/** Digital rain over the terminal. Any key, click or tap leaves. */
export default function Matrix({ onQuit }: { onQuit: (...l: Line[]) => void }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const box = boxRef.current!
    const canvas = canvasRef.current!
    box.focus()
    const ctx = canvas.getContext('2d')!
    const css = getComputedStyle(box)
    const fg = css.getPropertyValue('--term-fg').trim() || '#3cff7a'
    const accent = css.getPropertyValue('--term-accent').trim() || '#b6ffcb'
    const bg = css.getPropertyValue('--term-bg').trim() || '#0a0f0a'
    let drops: number[] = []
    let w = 0
    let h = 0

    function size() {
      const dpr = window.devicePixelRatio || 1
      w = box.clientWidth
      h = box.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      drops = Array.from({ length: Math.ceil(w / SIZE) }, () => Math.floor((Math.random() * -h) / SIZE))
    }

    function frame() {
      ctx.fillStyle = bg + 'cc'
      ctx.globalAlpha = 0.18
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = 1
      ctx.font = `${SIZE - 2}px "JetBrains Mono", ui-monospace, monospace`
      drops.forEach((y, i) => {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        ctx.fillStyle = Math.random() < 0.08 ? accent : fg
        ctx.fillText(ch, i * SIZE, y * SIZE)
        drops[i] = y * SIZE > h && Math.random() > 0.975 ? 0 : y + 1
      })
    }

    size()
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let timer = 0
    if (still) {
      // One settled frame instead of animation.
      drops = drops.map(() => Math.floor((Math.random() * h) / SIZE))
      for (let i = 0; i < 40; i++) frame()
    } else timer = window.setInterval(frame, 50)
    const ro = new ResizeObserver(size)
    ro.observe(box)
    return () => {
      clearInterval(timer)
      ro.disconnect()
    }
  }, [])

  const quit = () => onQuit([txt('Wake up, Neo… then try ', 'dim'), { t: 'games', cls: 'accent', run: 'games' }])

  return (
    <div
      ref={boxRef}
      className="term-program"
      tabIndex={0}
      role="img"
      aria-label="Falling green characters. Press any key to leave."
      onKeyDown={(e) => {
        e.preventDefault()
        quit()
      }}
      onClick={quit}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
