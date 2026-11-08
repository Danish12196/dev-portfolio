import { useEffect, useRef, useState } from 'react'
import { txt, type Line } from './lines'

const CELL = 16
const HUD = 28
const BEST_KEY = 'devportfolio.snake.best'

type Pt = { x: number; y: number }
const DIRS: Record<string, Pt> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  k: { x: 0, y: -1 },
  j: { x: 0, y: 1 },
  h: { x: -1, y: 0 },
  l: { x: 1, y: 0 },
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function saveBest(n: number) {
  try {
    localStorage.setItem(BEST_KEY, String(n))
  } catch {
    /* storage blocked */
  }
}

/** Snake, drawn on a canvas over the terminal. Arrows, WASD or hjkl to steer; swipe on a phone. */
export default function Snake({ onQuit }: { onQuit: (...l: Line[]) => void }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [, setTick] = useState(0)
  const game = useRef({
    cols: 20,
    rows: 12,
    snake: [] as Pt[],
    dir: { x: 1, y: 0 },
    queue: [] as Pt[],
    food: { x: 0, y: 0 },
    score: 0,
    best: readBest(),
    state: 'ready' as 'ready' | 'playing' | 'paused' | 'over',
  })

  function placeFood() {
    const g = game.current
    for (;;) {
      const f = { x: Math.floor(Math.random() * g.cols), y: Math.floor(Math.random() * g.rows) }
      if (!g.snake.some((p) => p.x === f.x && p.y === f.y)) return (g.food = f)
    }
  }

  function reset() {
    const g = game.current
    const box = boxRef.current!
    g.cols = Math.max(10, Math.floor(box.clientWidth / CELL))
    g.rows = Math.max(8, Math.floor((box.clientHeight - HUD) / CELL))
    const y = Math.floor(g.rows / 2)
    g.snake = [2, 1, 0].map((x) => ({ x, y }))
    g.dir = { x: 1, y: 0 }
    g.queue = []
    g.score = 0
    placeFood()
  }

  function quit() {
    const g = game.current
    onQuit([txt(`snake: score ${g.score}, best ${g.best}`, 'dim')])
  }

  function steer(d: Pt) {
    const g = game.current
    if (g.state === 'ready' || g.state === 'over') {
      reset()
      g.state = 'playing'
    }
    const last = g.queue[g.queue.length - 1] ?? g.dir
    if (d.x === -last.x && d.y === -last.y) return
    if (d.x === last.x && d.y === last.y) return
    if (g.queue.length < 3) g.queue.push(d)
  }

  function step() {
    const g = game.current
    if (g.state !== 'playing') return
    if (g.queue.length) g.dir = g.queue.shift()!
    const head = g.snake[0]
    const next = { x: head.x + g.dir.x, y: head.y + g.dir.y }
    const hitWall = next.x < 0 || next.y < 0 || next.x >= g.cols || next.y >= g.rows
    const eating = next.x === g.food.x && next.y === g.food.y
    const body = eating ? g.snake : g.snake.slice(0, -1)
    if (hitWall || body.some((p) => p.x === next.x && p.y === next.y)) {
      g.state = 'over'
      if (g.score > g.best) {
        g.best = g.score
        saveBest(g.best)
      }
      return
    }
    g.snake = [next, ...body]
    if (eating) {
      g.score++
      placeFood()
    }
  }

  function draw() {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box) return
    const g = game.current
    const dpr = window.devicePixelRatio || 1
    const w = box.clientWidth
    const h = box.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const css = getComputedStyle(box)
    const fg = css.getPropertyValue('--term-fg').trim() || '#3cff7a'
    const dim = css.getPropertyValue('--term-dim').trim() || '#2a9d53'
    const accent = css.getPropertyValue('--term-accent').trim() || '#b6ffcb'
    const bg = css.getPropertyValue('--term-bg').trim() || '#0a0f0a'
    const line = css.getPropertyValue('--term-line').trim() || '#1b2a1d'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    const ox = Math.floor((w - g.cols * CELL) / 2)
    const oy = HUD
    ctx.strokeStyle = line
    ctx.lineWidth = 1
    ctx.strokeRect(ox - 0.5, oy - 0.5, g.cols * CELL + 1, g.rows * CELL + 1)

    ctx.font = '13px "JetBrains Mono", ui-monospace, monospace'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = dim
    ctx.fillText(`score ${g.score}   best ${g.best}`, ox, HUD / 2)
    const help = window.matchMedia?.('(pointer: coarse)').matches ? 'swipe to steer' : 'q quits · space pauses'
    ctx.fillText(help, Math.min(ox + g.cols * CELL, w - 40) - ctx.measureText(help).width, HUD / 2)

    if (g.snake.length) {
      ctx.fillStyle = accent
      ctx.fillRect(ox + g.food.x * CELL + 4, oy + g.food.y * CELL + 4, CELL - 8, CELL - 8)
      g.snake.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? accent : fg
        ctx.fillRect(ox + p.x * CELL + 1, oy + p.y * CELL + 1, CELL - 2, CELL - 2)
      })
    }

    const msg =
      g.state === 'ready'
        ? ['SNAKE', 'press an arrow key or swipe to start']
        : g.state === 'paused'
          ? ['PAUSED', 'space to carry on']
          : g.state === 'over'
            ? ['GAME OVER', `score ${g.score}${g.score && g.score === g.best ? ' · new best!' : ''} · arrow or swipe to play again`]
            : null
    if (msg) {
      const cy = oy + g.rows * CELL * 0.28
      ctx.textAlign = 'center'
      ctx.fillStyle = accent
      ctx.font = 'bold 20px "JetBrains Mono", ui-monospace, monospace'
      ctx.fillText(msg[0], w / 2, cy - 14)
      ctx.fillStyle = fg
      ctx.font = '13px "JetBrains Mono", ui-monospace, monospace'
      ctx.fillText(msg[1], w / 2, cy + 14)
      ctx.textAlign = 'start'
    }
  }

  useEffect(() => {
    boxRef.current?.focus()
    reset()
    draw()
    let timer = 0
    const loop = () => {
      step()
      draw()
      const speed = Math.max(55, 120 - game.current.score * 3)
      timer = window.setTimeout(loop, speed)
    }
    loop()
    const ro = new ResizeObserver(() => {
      if (game.current.state !== 'playing') reset()
      draw()
    })
    ro.observe(boxRef.current!)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onKey(e: React.KeyboardEvent) {
    const g = game.current
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    if (key === 'q' || key === 'Escape') {
      e.preventDefault()
      return quit()
    }
    if (key === ' ') {
      e.preventDefault()
      if (g.state === 'playing') g.state = 'paused'
      else if (g.state === 'paused') g.state = 'playing'
      draw()
      return setTick((t) => t + 1)
    }
    const d = DIRS[key]
    if (d) {
      e.preventDefault()
      steer(d)
    }
  }

  const touch = useRef<Pt | null>(null)
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current
    const t = e.changedTouches[0]
    touch.current = null
    if (!start || !t) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    steer(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) })
  }

  return (
    <div
      ref={boxRef}
      className="term-program"
      tabIndex={0}
      role="application"
      aria-label="Snake. Arrow keys steer, space pauses, q quits."
      onKeyDown={onKey}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={onTouchEnd}
    >
      <canvas ref={canvasRef} />
      <button type="button" className="term-program-quit" onClick={quit} aria-label="Quit snake">
        ×
      </button>
    </div>
  )
}
