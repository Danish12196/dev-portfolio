// Guestbook API (Vercel function).
//
// GET  /api/guestbook  the approved notes, newest first
// POST /api/guestbook  leave a note; it waits in PocketBase until Danish ticks
//                      "approved" in the admin UI, and nobody else can read it
//
// Notes live in the "guestbook" collection on PocketBase (see
// scripts/setup-guestbook.mjs). The collection only lets this function create
// notes or read pending ones: it has to send the shared GUESTBOOK_KEY header,
// so a visitor can't skip the checks below by calling PocketBase directly.
//
// Environment:
//   GUESTBOOK_KEY          required, the key printed by the setup script
//   PB_URL                 optional, defaults to https://pb.danishali.dev
//   GUESTBOOK_NOTIFY_URL   optional, a Discord webhook or an ntfy topic URL
//                          that gets a ping for every new note

declare const process: { env: Record<string, string | undefined> }

const PB = (process.env.PB_URL || 'https://pb.danishali.dev').replace(/\/+$/, '')
const KEY = process.env.GUESTBOOK_KEY || ''
const NOTIFY = process.env.GUESTBOOK_NOTIFY_URL || ''
const COLLECTION = `${PB}/api/collections/guestbook/records`

const NAME_MAX = 40
const MESSAGE_MAX = 500
/** Notes from one visitor per window, and from everyone at once. */
const PER_VISITOR = 2
const PER_VISITOR_WINDOW_MIN = 10
const PENDING_PER_HOUR = 30
/** Bots fill the form instantly; people take a few seconds. */
const MIN_FILL_MS = 3000

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}

function pb(path: string, init: RequestInit = {}) {
  return fetch(`${COLLECTION}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(5000),
    headers: { 'Content-Type': 'application/json', 'X-Guestbook-Key': KEY, ...(init.headers ?? {}) },
  })
}

/** PocketBase wants "YYYY-MM-DD HH:MM:SS.sssZ" in filters. */
function pbDate(d: Date) {
  return d.toISOString().replace('T', ' ')
}

/** A salted hash of the visitor's IP: enough to rate limit, useless to anyone without the key. */
async function visitorHash(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown'
  const data = new TextEncoder().encode(`${KEY}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

/** Trims, drops control characters and squashes runs of blank lines. */
function clean(s: unknown, max: number) {
  if (typeof s !== 'string') return ''
  return s
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)
}

async function count(filter: string) {
  const res = await pb(`?perPage=1&skipTotal=0&fields=id&filter=${encodeURIComponent(filter)}`)
  if (!res.ok) throw new Error(`PocketBase ${res.status}`)
  const data = (await res.json()) as { totalItems: number }
  return data.totalItems
}

async function notify(name: string, message: string) {
  if (!NOTIFY) return
  const text = `New guestbook note from ${name}:\n\n${message}\n\nApprove it in ${PB}/_/#/collections?collection=guestbook`
  const discord = /discord(app)?\.com\/api\/webhooks\//.test(NOTIFY)
  try {
    await fetch(NOTIFY, {
      method: 'POST',
      headers: discord ? { 'Content-Type': 'application/json' } : { Title: 'danishali.dev guestbook', Tags: 'memo' },
      body: discord ? JSON.stringify({ content: text.slice(0, 1900), allowed_mentions: { parse: [] } }) : text,
    })
  } catch {
    // A missed ping is fine: the note is already saved.
  }
}

export async function GET() {
  if (!KEY) return json({ notes: [], error: 'The guestbook is not set up yet.' }, 503)
  try {
    const res = await pb(`?perPage=50&sort=-created&filter=${encodeURIComponent('approved = true')}&fields=id,name,message,created`)
    if (!res.ok) {
      console.error('guestbook GET failed:', res.status)
      return json({ notes: [], error: 'Could not load the guestbook.' }, 502)
    }
    const data = (await res.json()) as { items: { id: string; name: string; message: string; created: string }[] }
    return json({ notes: data.items }, 200, { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' })
  } catch (err) {
    console.error('guestbook GET error:', err)
    return json({ notes: [], error: 'Could not load the guestbook.' }, 502)
  }
}

export async function POST(request: Request) {
  if (!KEY) return json({ error: 'The guestbook is not set up yet.' }, 503)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'That did not look like a note.' }, 400)
  }

  // Honeypot and timing: answer "ok" so a bot has nothing to learn from.
  const elapsed = Number(body.elapsed)
  if (body.website || !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) return json({ ok: true })

  const name = clean(body.name, NAME_MAX).replace(/\s+/g, ' ')
  const message = clean(body.message, MESSAGE_MAX)
  if (!name) return json({ error: 'Add a name, even a made up one.' }, 400)
  if (message.length < 2) return json({ error: 'The note is empty.' }, 400)
  if ((message.match(/https?:\/\/|www\./gi) ?? []).length > 1) return json({ error: 'One link per note, please.' }, 400)

  const visitor = await visitorHash(request)
  try {
    const since = (min: number) => pbDate(new Date(Date.now() - min * 60_000))
    const [mine, pending] = await Promise.all([
      count(`visitor = "${visitor}" && created >= "${since(PER_VISITOR_WINDOW_MIN)}"`),
      count(`approved = false && created >= "${since(60)}"`),
    ])
    if (mine >= PER_VISITOR) return json({ error: 'You just left a note. Give it a few minutes.' }, 429)
    if (pending >= PENDING_PER_HOUR) return json({ error: 'The guestbook is busy right now. Try again later.' }, 429)

    const res = await pb('', { method: 'POST', body: JSON.stringify({ name, message, visitor, approved: false }) })
    if (!res.ok) throw new Error(`PocketBase ${res.status}`)
  } catch (err) {
    console.error('guestbook POST error:', err)
    return json({ error: 'Could not save the note. Try again in a bit.' }, 502)
  }

  await notify(name, message)
  return json({ ok: true })
}
