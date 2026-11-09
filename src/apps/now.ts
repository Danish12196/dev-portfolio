import { getNode } from '../fs'

export const NOW_PATH = '/now.md'

export interface Now {
  /** ISO date from the `<!-- updated: YYYY-MM-DD -->` comment in now.md */
  updated?: string
  /** the bullet points, as plain text */
  items: string[]
}

/** Reads content/now.md: the "what I'm working on" list shown on the desktop. */
export function readNow(): Now | undefined {
  const node = getNode(NOW_PATH)
  if (node?.type !== 'file' || !node.text) return undefined
  const updated = node.text.match(/<!--\s*updated:\s*(\d{4}-\d{2}-\d{2})\s*-->/)?.[1]
  const items = node.text
    .split('\n')
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, '').replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim())
  return items.length ? { updated, items } : undefined
}

/** "9 Nov 2026" from "2026-11-09", in the visitor's locale. */
export function formatUpdated(iso?: string) {
  if (!iso) return undefined
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
