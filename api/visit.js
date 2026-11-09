// Anonymous visit counter for the Stats window. No cookies, no IDs, no IP
// addresses stored: each page load sends how many seconds the tab was visible,
// and the server only keeps three running totals (visits, seconds, start date).
//
// To stop someone inflating the numbers with a script, requests are rate
// limited by a hash of IP + browser + today's date + a server secret. That hash
// is only used as a key that expires after an hour and can't be turned back
// into an address.
//
// Storage is any Upstash Redis database (Vercel > Storage > Upstash for Redis,
// free tier). Without one, POSTs are ignored and GET answers 204, and the
// Stats window leaves the visits row out.
import { createHash } from 'node:crypto'

const URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
const MAX_SECONDS = 30 * 60 // one tab left open all day shouldn't count as a day
const MAX_PER_HOUR = 40

async function redis(commands) {
  const res = await fetch(`${URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  return (await res.json()).map((r) => r.result)
}

export async function GET() {
  if (!URL || !TOKEN) return new Response(null, { status: 204 })
  try {
    const [visits, seconds, since] = await redis([['GET', 'visits'], ['GET', 'seconds'], ['GET', 'since']])
    const v = Number(visits ?? 0)
    const body = { visits: v, avgSeconds: v ? Math.round(Number(seconds ?? 0) / v) : 0, since }
    return Response.json(body, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } })
  } catch {
    return new Response(null, { status: 204 })
  }
}

export async function POST(request) {
  if (!URL || !TOKEN) return new Response(null, { status: 204 })
  let body
  try {
    body = JSON.parse(await request.text())
  } catch {
    return new Response(null, { status: 400 })
  }
  const seconds = Math.min(MAX_SECONDS, Math.max(0, Math.round(Number(body?.s) || 0)))
  const first = body?.n === 1
  if (!first && !seconds) return new Response(null, { status: 204 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const day = new Date().toISOString().slice(0, 10)
  const key = createHash('sha256').update(`${ip}|${request.headers.get('user-agent') ?? ''}|${day}|${TOKEN}`).digest('hex').slice(0, 32)
  try {
    const [hits] = await redis([['INCR', `rl:${key}`], ['EXPIRE', `rl:${key}`, 3600, 'NX']])
    if (hits > MAX_PER_HOUR) return new Response(null, { status: 204 })
    await redis([
      ...(first ? [['INCR', 'visits'], ['SET', 'since', day, 'NX']] : []),
      ['INCRBY', 'seconds', seconds],
    ])
  } catch {
    // Counting is best effort; never show the visitor an error for it.
  }
  return new Response(null, { status: 204 })
}
