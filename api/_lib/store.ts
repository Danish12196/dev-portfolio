// A tiny Redis client for Upstash's REST API (what Vercel's Redis/KV
// integration provides). Locally, with no credentials, it falls back to an
// in-memory copy so the API can be tried without a database.

type Arg = string | number
type Reply = unknown

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

/** True on Vercel when no database is linked yet. The API answers 503 instead of pretending. */
export const storeMissing = !URL_ && !!process.env.VERCEL_ENV

/** Runs several commands in one round trip and returns each reply. */
export async function redis(...cmds: Arg[][]): Promise<Reply[]> {
  if (!URL_ || !TOKEN) return cmds.map((c) => memory(c))
  const res = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  const out = (await res.json()) as { result?: Reply; error?: string }[]
  return out.map((r) => {
    if (r.error) throw new Error(r.error)
    return r.result
  })
}

/* ---------- in-memory stand-in, only the commands this API uses ---------- */

const kv = new Map<string, { v: unknown; exp: number }>()

function get<T>(key: string): T | undefined {
  const e = kv.get(key)
  if (!e) return undefined
  if (e.exp && e.exp < Date.now()) {
    kv.delete(key)
    return undefined
  }
  return e.v as T
}

function memory(cmd: Arg[]): Reply {
  const [op, key, ...rest] = cmd.map(String)
  const name = op.toUpperCase()
  switch (name) {
    case 'INCR': {
      const n = (Number(get(key)) || 0) + 1
      kv.set(key, { v: n, exp: kv.get(key)?.exp ?? 0 })
      return n
    }
    case 'EXPIRE': {
      const e = kv.get(key)
      if (!e) return 0
      if (rest.includes('NX') && e.exp) return 0
      e.exp = Date.now() + Number(rest[0]) * 1000
      return 1
    }
    case 'SET': {
      const nx = rest.includes('NX')
      const ex = rest.indexOf('EX')
      if (nx && get(key) !== undefined) return null
      kv.set(key, { v: rest[0], exp: ex >= 0 ? Date.now() + Number(rest[ex + 1]) * 1000 : 0 })
      return 'OK'
    }
    case 'ZADD': {
      const z = get<Map<string, number>>(key) ?? new Map()
      const gt = rest.includes('GT')
      const lt = rest.includes('LT')
      const args = rest.filter((a) => !['GT', 'LT', 'CH', 'NX', 'XX'].includes(a))
      let changed = 0
      for (let i = 0; i < args.length; i += 2) {
        const s = Number(args[i])
        const m = args[i + 1]
        const old = z.get(m)
        if (old !== undefined && ((gt && s <= old) || (lt && s >= old) || s === old)) continue
        z.set(m, s)
        changed++
      }
      kv.set(key, { v: z, exp: 0 })
      return changed
    }
    case 'ZRANGE': {
      const z = get<Map<string, number>>(key) ?? new Map()
      const rev = rest.includes('REV')
      const sorted = [...z.entries()].sort((a, b) => (rev ? b[1] - a[1] : a[1] - b[1]))
      const stop = Number(rest[1])
      return sorted.slice(Number(rest[0]), stop < 0 ? sorted.length + stop + 1 : stop + 1).map(([m]) => m)
    }
    case 'ZRANK':
    case 'ZREVRANK': {
      const z = get<Map<string, number>>(key) ?? new Map()
      if (!z.has(rest[0])) return null
      const sorted = [...z.entries()].sort((a, b) => (name === 'ZREVRANK' ? b[1] - a[1] : a[1] - b[1]))
      return sorted.findIndex(([m]) => m === rest[0])
    }
    case 'ZREMRANGEBYRANK': {
      const z = get<Map<string, number>>(key)
      if (!z) return 0
      const sorted = [...z.entries()].sort((a, b) => a[1] - b[1])
      const start = Number(rest[0])
      const stop = Number(rest[1])
      const end = stop < 0 ? sorted.length + stop + 1 : stop + 1
      const gone = sorted.slice(start < 0 ? Math.max(0, sorted.length + start) : start, end)
      gone.forEach(([m]) => z.delete(m))
      return gone.length
    }
    case 'HSET': {
      const h = get<Map<string, string>>(key) ?? new Map()
      for (let i = 0; i < rest.length; i += 2) h.set(rest[i], rest[i + 1])
      kv.set(key, { v: h, exp: 0 })
      return 1
    }
    case 'HMGET': {
      const h = get<Map<string, string>>(key) ?? new Map()
      return rest.map((f) => h.get(f) ?? null)
    }
    default:
      throw new Error(`memory store: ${name} not supported`)
  }
}
