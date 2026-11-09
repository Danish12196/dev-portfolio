import { getNode } from '../fs'

export const CV_PATH = '/cv.md'
const CONTACT_PATH = '/contact.json'
export const PDF_PATH = '/cv.pdf'

export interface Contact {
  name: string
  role?: string
  location?: string
  timezone?: string
  email?: string
  links: { label: string; url: string }[]
}

/** content/contact.json, with empty fields dropped so nothing half-filled shows. */
export function contact(): Contact {
  const node = getNode(CONTACT_PATH)
  let raw: Partial<Contact> = {}
  try {
    if (node?.type === 'file' && node.text) raw = JSON.parse(node.text)
  } catch {
    // A typo in contact.json should cost the card its details, not the whole site.
  }
  return {
    name: raw.name || 'Danish Ali',
    role: raw.role || undefined,
    location: raw.location || undefined,
    timezone: raw.timezone || undefined,
    email: raw.email?.trim() || undefined,
    links: (raw.links ?? []).filter((l) => l?.label && l?.url?.trim()),
  }
}

/** "14:05" in the given time zone, plus how far it is from the visitor's clock. */
export function localTime(timezone: string, now = new Date()) {
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: timezone })
  const offset = (tz?: string) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(now)
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  }
  const diff = Math.round((offset(timezone) - offset(undefined)) / 36e5 * 2) / 2
  const hours = Math.abs(diff) === 1 ? 'hour' : 'hours'
  const gap = diff === 0 ? 'same time as you' : diff > 0 ? `${diff} ${hours} ahead of you` : `${-diff} ${hours} behind you`
  return { time, gap }
}

/** cv.md carries a "coming soon" comment while the real CV is being rewritten. */
export function cvComingSoon() {
  const node = getNode(CV_PATH)
  return node?.type === 'file' && /<!--\s*coming soon\s*-->/i.test(node.text ?? '')
}
