// Shared PocketBase fetch, date formatting, and visitor IP hashing helpers for Vercel functions.

export const PB = (process.env.PB_URL || 'https://pb.danishali.dev').replace(/\/+$/, '')

/** PocketBase wants "YYYY-MM-DD HH:MM:SS.sssZ" in filters. */
export const pbDate = (ms: number) => new Date(ms).toISOString().replace('T', ' ')

export function pbFetch(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(5000),
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

export function clientIp(request: Request, fallback = 'unknown') {
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || request.headers.get('x-real-ip') || fallback
}

export async function hashVisitor(salt: string, ip: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}
