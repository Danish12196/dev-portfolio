// Anonymous visit counter for the Stats window (Vercel function).
//
// GET  /api/visit  { visits, avgSeconds, since }
// POST /api/visit  { id, s, n? } from the page: n marks a new page load, s is
//                  seconds the tab was visible since the last report
//
// Each page load becomes one row in the "site_visits" collection on PocketBase
// (see scripts/setup-visits.mjs) holding only how long the tab was visible.
// There are no cookies: the row id is a random string the page keeps in memory
// and forgets on reload. For rate limiting each row also stores a hash of the
// IP salted with today's date and VISITS_KEY, so it can't be reversed or linked
// across days.
//
// Environment:
//   VISITS_KEY   required, the key printed by the setup script
//   PB_URL       optional, defaults to https://pb.danishali.dev

declare const process: { env: Record<string, string | undefined> }

const PB = (process.env.PB_URL || 'https://pb.danishali.dev').replace(/\/+$/, '')
const KEY = process.env.VISITS_KEY || ''
const ROWS = `${PB}/api/collections/site_visits/records`
const TOTALS = `${PB}/api/collections/site_visit_totals/records`

/** One tab left open all day shouldn't count as a day. */
const MAX_SECONDS = 30 * 60
/** New page loads one visitor can add per hour. */
const PER_VISITOR_HOUR = 30
const ID = /^[a-z0-9]{15}$/

function pb(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Visits-Key': KEY, ...(init.headers ?? {}) },
  })
}

async function visitorHash(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown'
  const day = new Date().toISOString().slice(0, 10)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${KEY}:${day}:${ip}`))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

const empty = () => new Response(null, { status: 204 })

export async function GET() {
  if (!KEY) return empty()
  try {
    const res = await pb(`${TOTALS}?perPage=1`)
    if (!res.ok) return empty()
    const row = ((await res.json()) as { items: { visits: number; seconds: number; since: string }[] }).items[0]
    const visits = Number(row?.visits ?? 0)
    const body = { visits, avgSeconds: visits ? Math.round(Number(row.seconds ?? 0) / visits) : 0, since: row?.since ? String(row.since).replace(' ', 'T') : null }
    return Response.json(body, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } })
  } catch {
    return empty()
  }
}

export async function POST(request: Request) {
  if (!KEY) return empty()
  let body: { id?: unknown; s?: unknown; n?: unknown }
  try {
    body = JSON.parse(await request.text())
  } catch {
    return new Response(null, { status: 400 })
  }
  const id = typeof body.id === 'string' && ID.test(body.id) ? body.id : ''
  const seconds = Math.min(MAX_SECONDS, Math.max(0, Math.round(Number(body.s) || 0)))
  if (!id) return new Response(null, { status: 400 })

  try {
    if (body.n === 1) {
      const visitor = await visitorHash(request)
      const since = new Date(Date.now() - 3600_000).toISOString().replace('T', ' ')
      const filter = encodeURIComponent(`visitor = "${visitor}" && created >= "${since}"`)
      const recent = await pb(`${ROWS}?perPage=1&skipTotal=0&fields=id&filter=${filter}`)
      if (!recent.ok) throw new Error(`PocketBase ${recent.status}`)
      if (((await recent.json()) as { totalItems: number }).totalItems >= PER_VISITOR_HOUR) return empty()
      await pb(ROWS, { method: 'POST', body: JSON.stringify({ id, seconds, visitor }) })
    } else if (seconds) {
      // Later reports from the same page load add to its row, up to the cap.
      const res = await pb(`${ROWS}/${id}?fields=seconds`)
      if (!res.ok) return empty()
      const current = Number(((await res.json()) as { seconds: number }).seconds) || 0
      if (current < MAX_SECONDS) {
        await pb(`${ROWS}/${id}`, { method: 'PATCH', body: JSON.stringify({ seconds: Math.min(MAX_SECONDS, current + seconds) }) })
      }
    }
  } catch {
    // Counting is best effort; never show the visitor an error for it.
  }
  return empty()
}
