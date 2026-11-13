// Browser side of /api/leaderboard. Every call fails softly: if the
// leaderboard is offline the games still work, they just aren't ranked.

import type { Move } from './snakeEngine'

export type Board = 'snake' | 'achievements'

export interface Entry {
  name: string
  value: number
  at: number
}

export type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

const ENDPOINT = '/api/leaderboard'
const NAME_KEY = 'devportfolio.lb.name'

async function call<T>(init: RequestInit, query: string): Promise<Result<T>> {
  try {
    const res = await fetch(`${ENDPOINT}?${query}`, { ...init, headers: { 'Content-Type': 'application/json' } })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.error || (res.status === 404 ? 'leaderboard is offline' : `error ${res.status}`) }
    return { ok: true, ...body }
  } catch {
    return { ok: false, error: 'leaderboard is offline' }
  }
}

const post = <T>(action: string, body: unknown = {}) => call<T>({ method: 'POST', body: JSON.stringify(body) }, `action=${action}`)

export const fetchBoard = (board: Board) => call<{ entries: Entry[] }>({ method: 'GET' }, `board=${board}`)

export const snakeStart = () => post<{ token: string; seed: number }>('snake-start')

export const snakeSubmit = (g: { token: string; name: string; cols: number; rows: number; ticks: number; moves: Move[]; score: number }) =>
  post<{ rank: number | null; score: number; improved: boolean }>('snake', g)

export const achStart = (runId: string) => post<{ token: string }>('ach-start', { runId })

export const achFinish = (token: string, found: Record<string, number>, activeMs: number | undefined) =>
  post<{ finish: string; ms: number }>('ach-finish', { token, found, activeMs })

export const achSubmit = (finish: string, name: string) => post<{ rank: number | null; ms: number; improved: boolean }>('ach', { finish, name })

/** The last name someone used, so they don't have to type it every game. */
export function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* storage blocked */
  }
}

/** 83456 -> "1m 23.5s" */
export function formatMs(ms: number) {
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${Math.floor(s % 60)}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
