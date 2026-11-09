// Achievements: every secret on the site, when it was found, and how long the hunt took.
// Ideas for several of these (the response header, the DNS record, the console login,
// the WordPress login and hidden collectibles) come from https://lupine.dev.
import { create } from 'zustand'

export interface Achievement {
  id: string
  title: string
  /** Shown in the notepad before it's found. */
  hint: string
  /** Shown once found. */
  done: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'sudo', title: 'Not in the sudoers file', hint: 'Ask the terminal for superpowers.', done: 'You tried sudo.' },
  { id: 'rm', title: 'Deleted everything', hint: 'Try deleting everything. What could go wrong?', done: 'rm -rf / and a blue screen.' },
  { id: 'hack', title: 'Mainframe breached', hint: 'Every movie hacker types the same word.', done: 'You hacked the mainframe.' },
  { id: 'vim', title: 'Escaped vim', hint: 'Open a certain editor, then try to leave.', done: 'Put it on your CV.' },
  { id: 'coffee', title: 'Teapot', hint: 'The developer runs on a hot drink.', done: "Error 418: I'm a teapot." },
  { id: 'xyzzy', title: 'Nothing happens', hint: 'A magic word from a very old adventure game.', done: 'xyzzy' },
  { id: 'answer', title: 'Deep thought', hint: 'Life, the universe and everything.', done: '42.' },
  { id: 'dotfile', title: 'Dotfiles', hint: 'Some files hide from a plain ls.', done: 'ls -a found the secret file.' },
  { id: 'escape', title: 'Above home', hint: 'Try to climb above your home folder.', done: 'There is nothing above ~.' },
  { id: 'konami', title: '+30 lives', hint: '↑ ↑ ↓ ↓ ← → ← → …', done: 'Rainbow skin unlocked.' },
  { id: 'restart', title: 'Off and on again', hint: 'Have you tried turning it off and on again?', done: 'Restarted PaperOS.' },
  { id: 'shutdown', title: 'No off switch', hint: 'Try to switch the whole thing off.', done: 'Websites cannot shut down.' },
  { id: 'reader', title: 'Bookworm', hint: 'Read three READMEs.', done: 'Three READMEs read.' },
  { id: 'wordpress', title: 'Wrong CMS', hint: 'Every bot on the internet tries to log in to the same blog admin page.', done: 'This is not WordPress.' },
  { id: 'console', title: 'Root access', hint: 'Open the browser console. Someone left a login there.', done: 'Logged in from the console.' },
  { id: 'header', title: 'Read the headers', hint: 'The server sends a little extra with every page.', done: 'Found the x-achievement header.' },
  { id: 'dns', title: 'Dug deep', hint: 'Domains can keep text records too. Dig around.', done: 'Found the DNS TXT record.' },
  { id: 'star-sky', title: 'Wishing star', hint: 'A star is hiding somewhere on the desktop.', done: 'Caught the star on the desktop.' },
  { id: 'star-menu', title: 'Pocket star', hint: 'A star is tucked inside a menu (on a phone, the dock).', done: 'Found the pocket star.' },
  { id: 'star-term', title: 'Terminal star', hint: 'A star is printed in some system info.', done: 'Found the star in neofetch.' },
]

export type AchievementId = string

export interface Progress {
  /** Changes on every reset, so a leaderboard can tell runs apart. */
  runId: string
  /** First visit, or the moment of the last reset. */
  startedAt: number
  /** id -> when it was unlocked (ms since epoch). */
  found: Record<AchievementId, number>
  total: number
  /** Set once every achievement in this run is found. */
  finishedAt: number | null
  /** Time spent with the site open and visible during this run. */
  activeMs: number
  /** How many times this visitor has reset. */
  resets: number
}

const KEY = 'devportfolio.achievements'
const OLD_KEY = 'devportfolio.eggs'
const IDS = new Set(ACHIEVEMENTS.map((a) => a.id))

const newRunId = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)

function fresh(resets = 0): Progress {
  return { runId: newRunId(), startedAt: Date.now(), found: {}, total: ACHIEVEMENTS.length, finishedAt: null, activeMs: 0, resets }
}

function load(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Progress> | null
    if (saved && typeof saved.runId === 'string' && typeof saved.startedAt === 'number') {
      const found: Record<string, number> = {}
      for (const [id, at] of Object.entries(saved.found ?? {})) if (IDS.has(id) && typeof at === 'number') found[id] = at
      return {
        runId: saved.runId,
        startedAt: saved.startedAt,
        found,
        total: ACHIEVEMENTS.length,
        finishedAt: Object.keys(found).length === ACHIEVEMENTS.length ? (saved.finishedAt ?? Math.max(...Object.values(found))) : null,
        activeMs: Number(saved.activeMs) || 0,
        resets: Number(saved.resets) || 0,
      }
    }
    // Carry over secrets found before achievements existed. They don't count for timing.
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? '[]')
    const p = fresh()
    if (Array.isArray(old)) for (const id of old) if (IDS.has(id)) p.found[id] = p.startedAt
    localStorage.removeItem(OLD_KEY)
    return p
  } catch {
    return fresh()
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* storage blocked: progress lasts until the tab closes */
  }
}

interface State extends Progress {
  /** The most recent unlock, for the toast. */
  latest: { id: AchievementId; at: number } | null
  /** The notepad is shown after the first find; false when it's folded away to a tab. */
  notepadOpen: boolean
  setNotepad: (open: boolean) => void
}

const FOLD_KEY = 'devportfolio.notepad'

function savedNotepad() {
  try {
    const saved = localStorage.getItem(FOLD_KEY)
    return saved ? saved !== 'folded' : !window.matchMedia('(max-width: 720px)').matches
  } catch {
    return true
  }
}

const initial = load()
save(initial)

export const useAchievements = create<State>()((set) => ({
  ...initial,
  latest: null,
  notepadOpen: savedNotepad(),
  setNotepad: (notepadOpen) => {
    set({ notepadOpen })
    try {
      localStorage.setItem(FOLD_KEY, notepadOpen ? 'open' : 'folded')
    } catch {
      /* storage blocked */
    }
  },
}))

function progressOf(s: State): Progress {
  const { runId, startedAt, found, total, finishedAt, activeMs, resets } = s
  return { runId, startedAt, found: { ...found }, total, finishedAt, activeMs, resets }
}

/** A snapshot of this run, for leaderboards. */
export function getProgress(): Progress {
  tick()
  return progressOf(useAchievements.getState())
}

export function isFound(id: AchievementId) {
  return id in useAchievements.getState().found
}

type Listener = (e: { id: AchievementId; progress: Progress }) => void
const listeners = new Set<Listener>()

/** Called on every new unlock. Returns an unsubscribe function. */
export function onAchievement(cb: Listener) {
  listeners.add(cb)
  return () => void listeners.delete(cb)
}

/** Called once per run, when the last achievement is found. Also fired as the window event 'achievements:complete'. */
export function onAllFound(cb: (p: Progress) => void) {
  const on = (e: Event) => cb((e as CustomEvent<Progress>).detail)
  window.addEventListener('achievements:complete', on)
  return () => window.removeEventListener('achievements:complete', on)
}

/** Unlocks an achievement. Does nothing if it's already found. */
export function unlock(id: AchievementId) {
  if (!IDS.has(id) || isFound(id)) return
  tick()
  const now = Date.now()
  const s = useAchievements.getState()
  const found = { ...s.found, [id]: now }
  const done = Object.keys(found).length === ACHIEVEMENTS.length
  useAchievements.setState({ found, finishedAt: done ? now : null, latest: { id, at: now } })
  // On a phone the notepad would cover the screen, so it stays a tab there.
  if (!window.matchMedia('(max-width: 720px)').matches) useAchievements.getState().setNotepad(true)
  const progress = getProgress()
  save(progress)
  listeners.forEach((l) => l({ id, progress }))
  window.dispatchEvent(new CustomEvent('achievement', { detail: { id, progress } }))
  if (done) window.dispatchEvent(new CustomEvent('achievements:complete', { detail: progress }))
}

/** Forget everything found and start a new run with a new id. */
export function resetAchievements() {
  const next = fresh(useAchievements.getState().resets + 1)
  lastTick = performance.now()
  useAchievements.setState({ ...next, latest: null })
  save(next)
  readPaths = []
  try {
    localStorage.removeItem(READ_KEY)
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new CustomEvent('achievements:reset', { detail: next }))
}

/* ---------- active time: only counts while the tab is visible ---------- */

let lastTick = performance.now()

function tick() {
  const now = performance.now()
  const s = useAchievements.getState()
  // Gaps over 30s mean the machine slept or the timer was throttled; don't count them.
  const delta = now - lastTick
  lastTick = now
  if (s.finishedAt || document.visibilityState !== 'visible' || delta > 30_000) return
  useAchievements.setState({ activeMs: s.activeMs + delta })
}

setInterval(() => {
  tick()
  save(progressOf(useAchievements.getState()))
}, 5_000)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') lastTick = performance.now()
  else {
    tick()
    save(progressOf(useAchievements.getState()))
  }
})

/** A small number that stays the same for a run, so hidden things move after a reset. */
export function runSeed(salt: string) {
  const s = useAchievements.getState().runId + salt
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967296
}

/* ---------- Bookworm: three different READMEs ---------- */

export const READ_KEY = 'devportfolio.readmes'

// Kept in memory too, so it still works when storage is blocked.
let readPaths: string[] | null = null

export function markRead(path: string) {
  if (!/readme\.md$/i.test(path) && !path.endsWith('/about.md')) return
  if (!readPaths) {
    try {
      const saved = JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')
      readPaths = Array.isArray(saved) ? saved.filter((p) => typeof p === 'string') : []
    } catch {
      readPaths = []
    }
  }
  if (!readPaths.includes(path)) readPaths = [...readPaths, path]
  const seen = readPaths
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(seen))
  } catch {
    /* storage blocked */
  }
  if (seen.length >= 3) unlock('reader')
}

export function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}:${String(sec).padStart(2, '0')}`
}
