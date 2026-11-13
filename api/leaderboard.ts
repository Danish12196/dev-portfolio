// Leaderboards for snake high scores and the fastest time to find every achievement.
//
//   GET  /api/leaderboard?board=snake|achievements      top 10
//   POST /api/leaderboard?action=snake-start            { token, seed }
//   POST /api/leaderboard?action=snake                  { token, name, cols, rows, ticks, moves } -> { rank, score }
//   POST /api/leaderboard?action=ach-start              { runId } -> { token }
//   POST /api/leaderboard?action=ach-finish             { token, activeMs, found } -> { finish, ms }
//   POST /api/leaderboard?action=ach                    { finish, name } -> { rank, ms }
//
// Abuse checks: names go through a word filter, every write is rate limited
// per (hashed) IP, each signed token can only be used once, snake scores are
// replayed move by move on the server, and achievement times can't beat the
// clock the server started when the run began.

import { store, storeMissing, type Entry } from './_lib/store.js'
import { ipKey, nonce, secretMissing, sign, verify } from './_lib/token.js'
import { nameProblem, tidyName } from '../src/leaderboard/names.js'
import { ACHIEVEMENTS } from '../src/achievements/list.js'
import { MAX_COLS, MAX_ROWS, MIN_COLS, MIN_ROWS, replay, type Move } from '../src/leaderboard/snakeEngine.js'

const TOP = 10
const DAY = 86400

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } })
const fail = (error: string, status = 400) => json({ error }, status)

/** Counts hits for `bucket` from this visitor and says whether they're over `limit` per `windowS` seconds. */
const limited = (req: Request, bucket: string, limit: number, windowS: number) => store.limited(bucket, ipKey(req), limit, windowS)

/** Marks a token id as spent. False if it was already used. */
const spend = (id: string) => store.spend(id)

/* ------------------------------ boards ------------------------------ */

const BOARDS = {
  // Higher score wins; on a tie the earlier score stays ahead.
  snake: { highWins: true },
  // Lower time wins; on a tie the earlier run stays ahead.
  achievements: { highWins: false },
} as const
type Board = keyof typeof BOARDS

const top = (board: Board) => store.top(board, BOARDS[board].highWins, TOP)
const save = (board: Board, e: Entry) => store.save(board, BOARDS[board].highWins, e)

function checkName(raw: unknown) {
  const name = tidyName(String(raw ?? ''))
  return { name, problem: nameProblem(name) }
}

/* ------------------------------ snake ------------------------------ */

interface SnakeToken {
  k: 'snake'
  n: string
  seed: number
  iat: number
}
const SNAKE_TTL = 6 * 3600

async function snakeStart(req: Request) {
  if (await limited(req, 'snake-start', 120, 600)) return fail('slow down', 429)
  const seed = Math.floor(Math.random() * 2 ** 32)
  const t: SnakeToken = { k: 'snake', n: nonce(), seed, iat: Date.now() }
  return json({ token: sign(t), seed })
}

async function snakeSubmit(req: Request, body: Record<string, unknown>) {
  const t = verify<SnakeToken>(body.token)
  if (!t || t.k !== 'snake') return fail('bad token')
  const elapsed = Date.now() - t.iat
  if (elapsed > SNAKE_TTL * 1000) return fail('that game is too old')
  const { name, problem } = checkName(body.name)
  if (problem) return fail(problem)

  const cols = Number(body.cols)
  const rows = Number(body.rows)
  const ticks = Number(body.ticks)
  const moves = body.moves as Move[]
  if (!Number.isInteger(cols) || cols < MIN_COLS || cols > MAX_COLS) return fail('bad board')
  if (!Number.isInteger(rows) || rows < MIN_ROWS || rows > MAX_ROWS) return fail('bad board')
  if (!Number.isInteger(ticks) || ticks < 1 || ticks > 500_000) return fail('bad game')
  if (!Array.isArray(moves) || moves.length > ticks) return fail('bad game')
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i]
    if (!Array.isArray(m) || m.length !== 2 || !Number.isInteger(m[0]) || !Number.isInteger(m[1])) return fail('bad game')
    if (i && m[0] <= moves[i - 1][0]) return fail('bad game')
  }

  // Checked before the replay so a flood of fake games can't burn server time.
  if (await limited(req, 'snake', 10, 600)) return fail('too many scores, try again in a few minutes', 429)
  const r = replay(cols, rows, t.seed, moves, ticks)
  if (!r.ok) return fail(`that game doesn't add up (${r.reason})`)
  if (r.score < 1) return fail('eat something first')
  if (body.score !== undefined && Number(body.score) !== r.score) return fail("that game doesn't add up (score)")
  // The game speeds up but never past one tick per 55ms, so a real game can't finish faster than this.
  if (elapsed < r.minMs * 0.8) return fail('that was faster than the snake can move')

  if (!(await spend(t.n))) return fail('that game was already submitted')

  const { rank, improved } = await save('snake', { name, value: r.score, at: Date.now() })
  return json({ rank, score: r.score, improved })
}

/* --------------------------- achievements --------------------------- */

interface AchStart {
  k: 'ach'
  n: string
  run: string
  iat: number
}
interface AchFinish {
  k: 'achf'
  n: string
  ms: number
  iat: number
}
const RUN_TTL = 90 * DAY
/** No one finds all of them in under this, even knowing every answer. */
const MIN_RUN_MS = 60_000
const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id))

async function achStart(req: Request, body: Record<string, unknown>) {
  const run = String(body.runId ?? '')
  if (!/^[\w-]{4,64}$/.test(run)) return fail('bad run')
  if (await limited(req, 'ach-start', 30, 3600)) return fail('slow down', 429)
  const t: AchStart = { k: 'ach', n: nonce(), run, iat: Date.now() }
  return json({ token: sign(t) })
}

async function achFinish(req: Request, body: Record<string, unknown>) {
  const t = verify<AchStart>(body.token)
  if (!t || t.k !== 'ach') return fail('bad token')
  const wall = Date.now() - t.iat
  if (wall > RUN_TTL * 1000) return fail('that run is too old')

  const found = body.found as Record<string, number>
  if (!found || typeof found !== 'object') return fail('bad run')
  const ids = Object.keys(found)
  if (ids.length !== ACHIEVEMENT_IDS.size || !ids.every((id) => ACHIEVEMENT_IDS.has(id))) return fail('not everything is found yet')
  if (!ids.every((id) => Number.isFinite(found[id]))) return fail('bad run')

  // Rank on time with the tab open when the browser reports it, but never on
  // less than the slowest unlock or more than the server's own clock allows.
  const span = Math.max(...ids.map((id) => found[id])) - Math.min(...ids.map((id) => found[id]))
  const active = Number(body.activeMs)
  let ms = Number.isFinite(active) && active > 0 ? Math.min(active, wall) : wall
  if (span > wall + 5000) return fail("that run doesn't add up")
  ms = Math.round(Math.max(ms, span, MIN_RUN_MS))
  if (wall < MIN_RUN_MS) return fail('that was too fast to be real')

  if (await limited(req, 'ach-finish', 10, 3600)) return fail('slow down', 429)
  if (!(await spend(t.n))) return fail('that run was already finished')
  const f: AchFinish = { k: 'achf', n: nonce(), ms, iat: Date.now() }
  return json({ finish: sign(f), ms })
}

async function achSubmit(req: Request, body: Record<string, unknown>) {
  const f = verify<AchFinish>(body.finish)
  if (!f || f.k !== 'achf') return fail('bad token')
  if (Date.now() - f.iat > RUN_TTL * 1000) return fail('that run is too old')
  const { name, problem } = checkName(body.name)
  if (problem) return fail(problem)
  if (await limited(req, 'ach', 10, 600)) return fail('too many submissions, try again in a few minutes', 429)
  if (!(await spend(f.n))) return fail('that run is already on the board')
  const { rank, improved } = await save('achievements', { name, value: f.ms, at: Date.now() })
  return json({ rank, ms: f.ms, improved })
}

/* ------------------------------ routes ------------------------------ */

function offline() {
  if (storeMissing || secretMissing) return fail('leaderboard is not set up yet', 503)
  return null
}

export async function GET(req: Request) {
  const down = offline()
  if (down) return down
  const board = new URL(req.url).searchParams.get('board')
  if (board !== 'snake' && board !== 'achievements') return fail('unknown board', 404)
  try {
    return json({ board, entries: await top(board) }, 200, { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' })
  } catch (e) {
    console.error(e)
    return fail('leaderboard is unavailable', 502)
  }
}

export async function POST(req: Request) {
  const down = offline()
  if (down) return down
  const action = new URL(req.url).searchParams.get('action')
  const text = await req.text()
  if (text.length > 64_000) return fail('too big', 413)
  let body: Record<string, unknown> = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    return fail('bad json')
  }
  try {
    switch (action) {
      case 'snake-start':
        return await snakeStart(req)
      case 'snake':
        return await snakeSubmit(req, body)
      case 'ach-start':
        return await achStart(req, body)
      case 'ach-finish':
        return await achFinish(req, body)
      case 'ach':
        return await achSubmit(req, body)
      default:
        return fail('unknown action', 404)
    }
  } catch (e) {
    console.error(e)
    return fail('leaderboard is unavailable', 502)
  }
}
