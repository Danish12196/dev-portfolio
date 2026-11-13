/** The numbers behind the Stats window and the `stats` command. */

export interface Day {
  date: string
  count: number
}

export interface Contributions {
  days: Day[]
  /** false when the build could only read colour levels, not exact counts */
  exact: boolean
  total: number
  activeDays: number
  currentStreak: number
  longestStreak: number
  busiestDay: Day | null
  /** contributions per weekday, Sunday first */
  weekday: number[]
}

export interface Commit {
  repo: string
  sha: string
  message: string
  date: string
  url: string
}

export interface Stats {
  builtAt: string
  github: {
    profile: { login: string; publicRepos: number; followers: number; since: string; stars: number } | null
    contributions: Contributions | null
    languages: { name: string; share: number }[] | null
    commits: Commit[] | null
  }
  itch: { title: string; url: string; views: number; downloads: number }[] | null
  site: { commits: number | null; files: number }
}

export interface Visits {
  visits: number
  avgSeconds: number
  since: string | null
}

// Fetched once per page load and shared by the window and the terminal.
let stats: Promise<Stats | null> | undefined
let visits: Promise<Visits | null> | undefined

export function loadStats() {
  stats ??= fetch('/stats.json')
    .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
    .catch(() => null)
  return stats
}

export function loadVisits() {
  visits ??= fetch('/api/visit')
    .then((r) => (r.status === 200 ? (r.json() as Promise<Visits>) : null))
    .catch(() => null)
  return visits
}

/** "3h ago", "2d ago", "5 Mar" */
export function ago(iso: string, now = Date.now()) {
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
  if (mins < 60 * 24 * 30) return `${Math.round(mins / 60 / 24)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

import { formatDuration } from '../achievements'

export function duration(seconds: number) {
  return formatDuration(seconds * 1000, 'words')
}

/** 0 to 4, like GitHub's own colour levels, scaled to the busiest day. */
export function level(count: number, max: number) {
  if (!count) return 0
  return Math.min(4, Math.max(1, Math.ceil((count / Math.max(max, 1)) * 4)))
}

/** The days as weeks (columns of Sunday..Saturday), padded so the first week starts on Sunday. */
export function weeks(days: Day[], count = 53) {
  const recent = days.slice(-count * 7)
  const pad = recent.length ? new Date(`${recent[0].date}T00:00:00Z`).getUTCDay() : 0
  const cells: (Day | null)[] = [...Array(pad).fill(null), ...recent]
  const out: (Day | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7))
  return out.slice(-count)
}

// Colours for the language bar, in the Soft Paper pastels.
export const LANG_COLORS = ['#f7b267', '#7cc9a0', '#8fcfe0', '#f49a8c', '#f7d774', '#c3a6e0', '#d6cbbb']
