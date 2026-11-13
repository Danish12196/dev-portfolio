// The rules of snake, with no drawing or timers, so the browser and the
// leaderboard server run exactly the same game. The server replays a player's
// moves from the same seed to check a score before it goes on the board.

export type Pt = { x: number; y: number }

/** Direction codes used in the move log: up, right, down, left. */
export const DIR_CODES: Pt[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

export const dirCode = (d: Pt) => DIR_CODES.findIndex((c) => c.x === d.x && c.y === d.y)

/** Board size limits. The browser sizes the board to the window; the server rejects anything outside these. */
export const MIN_COLS = 10
export const MAX_COLS = 80
export const MIN_ROWS = 8
export const MAX_ROWS = 60

/** Milliseconds per tick at a given score. The game speeds up as you eat. */
export const tickMs = (score: number) => Math.max(55, 120 - score * 3)

/** Small seeded random number generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface SnakeGame {
  cols: number
  rows: number
  snake: Pt[]
  dir: Pt
  food: Pt
  score: number
  ticks: number
  over: boolean
  rand: () => number
}

/** Puts food on a random free cell. Returns false when the board is full. */
function placeFood(g: SnakeGame) {
  const free: Pt[] = []
  for (let y = 0; y < g.rows; y++)
    for (let x = 0; x < g.cols; x++) if (!g.snake.some((p) => p.x === x && p.y === y)) free.push({ x, y })
  if (!free.length) return false
  g.food = free[Math.floor(g.rand() * free.length)]
  return true
}

export function newGame(cols: number, rows: number, seed: number): SnakeGame {
  const y = Math.floor(rows / 2)
  const g: SnakeGame = {
    cols,
    rows,
    snake: [2, 1, 0].map((x) => ({ x, y })),
    dir: { x: 1, y: 0 },
    food: { x: 0, y: 0 },
    score: 0,
    ticks: 0,
    over: false,
    rand: rng(seed),
  }
  placeFood(g)
  return g
}

/** Can the snake turn from its current heading to `d`? Reversing or repeating is ignored. */
export function canTurn(from: Pt, d: Pt) {
  return !(d.x === -from.x && d.y === -from.y) && !(d.x === from.x && d.y === from.y)
}

/** Moves the snake one cell. Sets `over` when it hits a wall or itself, or fills the board. */
export function tick(g: SnakeGame) {
  if (g.over) return
  g.ticks++
  const head = g.snake[0]
  const next = { x: head.x + g.dir.x, y: head.y + g.dir.y }
  const hitWall = next.x < 0 || next.y < 0 || next.x >= g.cols || next.y >= g.rows
  const eating = next.x === g.food.x && next.y === g.food.y
  const body = eating ? g.snake : g.snake.slice(0, -1)
  if (hitWall || body.some((p) => p.x === next.x && p.y === next.y)) {
    g.over = true
    return
  }
  g.snake = [next, ...body]
  if (eating) {
    g.score++
    // Filling the whole board ends the game as a win.
    if (!placeFood(g)) g.over = true
  }
}

/** One turn in the move log: [tick it was applied on, direction code]. */
export type Move = [number, number]

export interface ReplayResult {
  ok: boolean
  reason?: string
  score: number
  ticks: number
  /** The fastest the game could have been played, in milliseconds. */
  minMs: number
}

/**
 * Plays a game back from its seed and move log. The game has to end exactly on
 * its last tick, so a log can't be cut short or padded.
 */
export function replay(cols: number, rows: number, seed: number, moves: Move[], ticks: number): ReplayResult {
  const g = newGame(cols, rows, seed)
  let minMs = 0
  let m = 0
  for (let t = 0; t < ticks; t++) {
    if (g.over) return { ok: false, reason: 'game ended early', score: g.score, ticks: t, minMs }
    if (m < moves.length && moves[m][0] === t) {
      const d = DIR_CODES[moves[m][1]]
      if (!d || !canTurn(g.dir, d)) return { ok: false, reason: 'bad move', score: g.score, ticks: t, minMs }
      g.dir = d
      m++
    }
    minMs += tickMs(g.score)
    tick(g)
  }
  if (m !== moves.length) return { ok: false, reason: 'moves left over', score: g.score, ticks, minMs }
  if (!g.over) return { ok: false, reason: 'game not over', score: g.score, ticks, minMs }
  return { ok: true, score: g.score, ticks, minMs }
}
