// Leaderboard storage on PocketBase (pb.danishali.dev), in three collections
// made by scripts/setup-leaderboards.mjs:
//
//   lb_scores  one row per board and name: its best score or time
//   lb_spent   ids of tokens already used, so a game can't be submitted twice
//   lb_hits    one row per write, for rate limiting (old rows are trimmed)
//
// Every collection only answers requests that carry LEADERBOARD_KEY, so
// visitors can't write to PocketBase directly and skip the checks.
// Locally, with no key, an in-memory stand-in is used instead.

import { PB, pbDate, pbFetch } from './pb.js'

export const KEY = process.env.LEADERBOARD_KEY || ''

/** True on Vercel when the key isn't set yet. The API answers 503 instead of pretending. */
export const storeMissing = !KEY && !!process.env.VERCEL_ENV

export interface Entry {
  name: string
  value: number
  at: number
}

export interface Store {
  /** Records a hit and says whether `visitor` is over `limit` in the last `windowS` seconds. */
  limited(bucket: string, visitor: string, limit: number, windowS: number): Promise<boolean>
  /** Marks a token id as used. False if it already was. */
  spend(id: string): Promise<boolean>
  top(board: string, highWins: boolean, n: number): Promise<Entry[]>
  /** Keeps each name's best. Returns its 1-based rank and whether this beat its old entry. */
  save(board: string, highWins: boolean, e: Entry, retry?: boolean): Promise<{ rank: number; improved: boolean }>
}

/* ------------------------------ PocketBase ------------------------------ */

const q = (s: string) => `"${s.replace(/["\\]/g, '')}"`

async function pb<T>(collection: string, path = '', init: RequestInit = {}): Promise<{ ok: boolean; status: number; body: T }> {
  const res = await pbFetch(`${PB}/api/collections/${collection}/records${path}`, {
    ...init,
    headers: { 'X-Leaderboard-Key': KEY, ...(init.headers ?? {}) },
  })
  const body = (await res.json().catch(() => ({}))) as T
  if (res.status >= 500) throw new Error(`PocketBase ${res.status}`)
  return { ok: res.ok, status: res.status, body }
}

const list = <T>(collection: string, params: Record<string, string>) =>
  pb<{ items: T[]; totalItems: number }>(collection, `?${new URLSearchParams(params)}`)

interface ScoreRow {
  id: string
  name: string
  value: number
  at: number
}

const pocketbase: Store = {
  async limited(bucket, visitor, limit, windowS) {
    const since = Date.now() - windowS * 1000
    const r = await list('lb_hits', {
      perPage: '1',
      skipTotal: '0',
      fields: 'id',
      filter: `bucket = ${q(bucket)} && visitor = ${q(visitor)} && created >= ${q(pbDate(since))}`,
    })
    if (!r.ok) throw new Error(`PocketBase ${r.status}`)
    if (r.body.totalItems >= limit) return true
    await pb('lb_hits', '', { method: 'POST', body: JSON.stringify({ bucket, visitor }) })
    // Now and then, clear out hits older than a day so the table stays small.
    if (Math.random() < 0.02) void trimHits()
    return false
  },

  async spend(id) {
    // The unique index on `token` turns a second use into a 400.
    const r = await pb('lb_spent', '', { method: 'POST', body: JSON.stringify({ token: id }) })
    return r.ok
  },

  async top(board, highWins, n) {
    const r = await list<ScoreRow>('lb_scores', {
      perPage: String(n),
      skipTotal: '1',
      fields: 'name,value,at',
      filter: `board = ${q(board)}`,
      sort: `${highWins ? '-' : ''}value,at`,
    })
    if (!r.ok) throw new Error(`PocketBase ${r.status}`)
    return r.body.items.map(({ name, value, at }) => ({ name, value, at }))
  },

  async save(board, highWins, e, retry = true) {
    const nameKey = e.name.toLowerCase()
    const found = await list<ScoreRow>('lb_scores', {
      perPage: '1',
      skipTotal: '1',
      filter: `board = ${q(board)} && name_key = ${q(nameKey)}`,
    })
    if (!found.ok) throw new Error(`PocketBase ${found.status}`)
    const old = found.body.items[0]
    let improved = false
    let mine = old
    if (!old) {
      const r = await pb<ScoreRow>('lb_scores', '', { method: 'POST', body: JSON.stringify({ board, name_key: nameKey, ...e }) })
      // Two first saves under one name at once: the unique index lets one in, and the other retries as an update.
      if (!r.ok) {
        if (retry) return pocketbase.save(board, highWins, e, false)
        throw new Error(`PocketBase ${r.status}`)
      }
      improved = true
      mine = r.body
    } else if (highWins ? e.value > old.value : e.value < old.value) {
      const r = await pb<ScoreRow>('lb_scores', `/${old.id}`, { method: 'PATCH', body: JSON.stringify(e) })
      improved = r.ok
      if (r.ok) mine = r.body
    }
    const better = highWins ? '>' : '<'
    const ahead = await list('lb_scores', {
      perPage: '1',
      skipTotal: '0',
      fields: 'id',
      filter: `board = ${q(board)} && (value ${better} ${mine!.value} || (value = ${mine!.value} && at < ${mine!.at}))`,
    })
    if (!ahead.ok) throw new Error(`PocketBase ${ahead.status}`)
    return { rank: ahead.body.totalItems + 1, improved }
  },
}

async function trimHits() {
  try {
    const old = await list<{ id: string }>('lb_hits', { perPage: '200', skipTotal: '1', fields: 'id', filter: `created < ${q(pbDate(Date.now() - 86400_000))}` })
    await Promise.all((old.body.items ?? []).map((h) => pb('lb_hits', `/${h.id}`, { method: 'DELETE' })))
  } catch {
    /* next time */
  }
}

/* --------------------- in-memory stand-in for local runs --------------------- */

const hits = new Map<string, number[]>()
const spent = new Set<string>()
const scores = new Map<string, Map<string, Entry>>()

const memory: Store = {
  async limited(bucket, visitor, limit, windowS) {
    const k = `${bucket}:${visitor}`
    const now = Date.now()
    const recent = (hits.get(k) ?? []).filter((t) => t >= now - windowS * 1000)
    if (recent.length >= limit) return true
    hits.set(k, [...recent, now])
    return false
  },
  async spend(id) {
    if (spent.has(id)) return false
    spent.add(id)
    return true
  },
  async top(board, highWins, n) {
    return sorted(board, highWins).slice(0, n)
  },
  async save(board, highWins, e) {
    const b = scores.get(board) ?? new Map<string, Entry>()
    scores.set(board, b)
    const k = e.name.toLowerCase()
    const old = b.get(k)
    const improved = !old || (highWins ? e.value > old.value : e.value < old.value)
    if (improved) b.set(k, e)
    return { rank: sorted(board, highWins).findIndex((x) => x.name.toLowerCase() === k) + 1, improved }
  },
}

function sorted(board: string, highWins: boolean) {
  return [...(scores.get(board)?.values() ?? [])].sort((a, b) => (highWins ? b.value - a.value : a.value - b.value) || a.at - b.at)
}

export const store: Store = KEY ? pocketbase : memory
