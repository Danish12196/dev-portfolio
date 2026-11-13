import { useEffect, useRef, useState } from 'react'
import { txt, type Line } from './lines'
import { MAX_COLS, MAX_ROWS, canTurn, dirCode, newGame, tick, tickMs, type Move, type Pt, type SnakeGame } from '../leaderboard/snakeEngine'
import { snakeStart } from '../leaderboard/api'
import SnakeBoard from '../leaderboard/SnakeBoard'

const CELL = 16
const HUD = 28
const BEST_KEY = 'devportfolio.snake.best'

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
    g: newGame(20, 12, 1) as SnakeGame,
    queue: [] as Pt[],
    moves: [] as Move[],
    best: readBest(),
    state: 'ready' as 'ready' | 'playing' | 'paused' | 'over',
    /** Signed seed for the next game, fetched ahead so starting a game never waits on the network. */
    next: null as { token: string; seed: number } | null,
    /** The token this game was dealt with. Null means it can't go on the leaderboard. */
    token: null as string | null,
  })
  const [over, setOver] = useState<{ id: number; token: string | null; score: number; cols: number; rows: number; ticks: number; moves: Move[] } | null>(null)

  function prefetch() {
    snakeStart().then((r) => {
      if (r.ok) game.current.next = { token: r.token, seed: r.seed }
    })
  }

  function gameOver() {
    const s = game.current
    s.state = 'over'
    const { g } = s
    if (g.score > s.best) {
      s.best = g.score
      saveBest(s.best)
    }
    setOver({ id: Date.now(), token: s.token, score: g.score, cols: g.cols, rows: g.rows, ticks: g.ticks, moves: s.moves })
  }

  function reset() {
    const s = game.current
    const box = boxRef.current!
    const cols = Math.min(MAX_COLS, Math.max(10, Math.floor(box.clientWidth / CELL)))
    const rows = Math.min(MAX_ROWS, Math.max(8, Math.floor((box.clientHeight - HUD) / CELL)))
    const next = s.next
    s.token = next?.token ?? null
    s.g = newGame(cols, rows, next?.seed ?? Math.floor(Math.random() * 2 ** 32))
    s.queue = []
    s.moves = []
  }

  /** Starts a fresh game, spending the prefetched seed if there is one. */
  function start() {
    const s = game.current
    reset()
    if (s.next) {
      s.next = null
      prefetch()
    }
    s.state = 'playing'
    setOver(null)
  }

  function quit() {
    const s = game.current
    onQuit([txt(`snake: score ${s.g.score}, best ${s.best}`, 'dim')])
  }

  function steer(d: Pt) {
    const s = game.current
    if (s.state === 'ready' || s.state === 'over') start()
    const last = s.queue[s.queue.length - 1] ?? s.g.dir
    if (!canTurn(last, d)) return
    if (s.queue.length < 3) s.queue.push(d)
  }

  function step() {
    const s = game.current
    if (s.state !== 'playing') return
    const d = s.queue.shift()
    if (d && canTurn(s.g.dir, d)) {
      // Logged with the tick it takes effect on, so the server can replay the game.
      s.moves.push([s.g.ticks, dirCode(d)])
      s.g.dir = d
    }
    tick(s.g)
    if (s.g.over) gameOver()
  }

  function draw() {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box) return
    const { g, best, state } = game.current
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
    ctx.fillText(`score ${g.score}   best ${best}`, ox, HUD / 2)
    const help = window.matchMedia?.('(pointer: coarse)').matches ? 'swipe to steer' : 'q quits · space pauses'
    ctx.fillText(help, Math.min(ox + g.cols * CELL, w - 40) - ctx.measureText(help).width, HUD / 2)

    {
      ctx.fillStyle = accent
      ctx.fillRect(ox + g.food.x * CELL + 4, oy + g.food.y * CELL + 4, CELL - 8, CELL - 8)
      g.snake.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? accent : fg
        ctx.fillRect(ox + p.x * CELL + 1, oy + p.y * CELL + 1, CELL - 2, CELL - 2)
      })
    }

    const msg =
      state === 'ready'
        ? ['SNAKE', 'press an arrow key or swipe to start']
        : state === 'paused'
          ? ['PAUSED', 'space to carry on']
          : state === 'over'
            ? ['GAME OVER', `score ${g.score}${g.score && g.score === best ? ' · new best!' : ''} · arrow or swipe to play again`]
            : null
    if (msg) {
      const cy = oy + g.rows * CELL * 0.22
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
    prefetch()
    draw()
    let timer = 0
    const loop = () => {
      step()
      draw()
      const speed = tickMs(game.current.g.score)
      timer = window.setTimeout(loop, speed)
    }
    loop()
    const ro = new ResizeObserver(() => {
      // Only a board that hasn't started follows the new size; a game in progress or just finished keeps its grid and score.
      const { state } = game.current
      if (state === 'ready') reset()
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
    if (e.target !== e.currentTarget) return
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
      {over && over.score > 0 && <SnakeBoard key={over.id} game={over} onDone={() => boxRef.current?.focus()} />}
      <button type="button" className="term-program-quit" onClick={quit} aria-label="Quit snake">
        ×
      </button>
    </div>
  )
}
