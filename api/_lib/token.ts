// Signed tokens: the server hands one out when a game or run starts, and
// checks the signature when a score comes back, so start times and seeds
// can't be made up in the browser.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Signed with the same LEADERBOARD_KEY that unlocks the PocketBase collections, so there's one secret to set.
const SECRET = process.env.LEADERBOARD_KEY || (process.env.VERCEL_ENV ? '' : 'local-dev-only')

export const secretMissing = !SECRET

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const mac = (body: string) => createHmac('sha256', SECRET).update(body).digest()

export const nonce = () => randomBytes(12).toString('base64url')

export function sign(payload: object): string {
  const body = b64(JSON.stringify(payload))
  return `${body}.${b64(mac(body))}`
}

/** Returns the payload if the signature is good, otherwise null. */
export function verify<T>(token: unknown): T | null {
  if (typeof token !== 'string' || token.length > 2000) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const want = mac(body)
  const got = Buffer.from(sig, 'base64url')
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as T
  } catch {
    return null
  }
}

/** One-way hash of the visitor's IP, so rate limits work without storing addresses. */
export function ipKey(req: Request) {
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  return createHmac('sha256', SECRET || 'x').update(ip).digest('base64url').slice(0, 16)
}
