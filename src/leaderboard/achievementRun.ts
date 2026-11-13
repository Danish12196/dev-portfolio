// Ties an achievement run to the leaderboard. When a run starts (first visit
// or a reset) the server hands out a signed start token; when the last
// achievement is found, the server turns it into a finish token holding the
// time, checked against its own clock. The name is added whenever the player
// gets round to it.

import { create } from 'zustand'
import { getProgress, onAllFound, type Progress } from '../achievements'
import { achFinish, achStart, achSubmit } from './api'

const KEY = 'devportfolio.lb.run'
/** A start token fetched later than this after the run began can't vouch for the time, so the run isn't ranked. */
const LATE_MS = 2 * 60_000

interface RunState {
  runId: string | null
  token: string | null
  /** False when the run started before it could be timed (offline, or from before the leaderboard). */
  ranked: boolean
  finish: string | null
  ms: number | null
  rank: number | null
  error: string
}

const blank: RunState = { runId: null, token: null, ranked: false, finish: null, ms: null, rank: null, error: '' }

function load(): RunState {
  try {
    return { ...blank, ...JSON.parse(localStorage.getItem(KEY) ?? '{}'), error: '' }
  } catch {
    return blank
  }
}

export const useRun = create<RunState>()(() => load())

useRun.subscribe((s) => {
  try {
    const { error: _error, ...keep } = s
    void _error
    localStorage.setItem(KEY, JSON.stringify(keep))
  } catch {
    /* storage blocked */
  }
})

async function start(p: Progress) {
  const late = Date.now() - p.startedAt > LATE_MS || Object.keys(p.found).length > 0
  useRun.setState({ ...blank, runId: p.runId })
  if (late) return
  const r = await achStart()
  if (useRun.getState().runId !== p.runId) return
  useRun.setState(r.ok ? { token: r.token, ranked: true } : { error: r.error })
}

async function finish(p: Progress) {
  const s = useRun.getState()
  if (s.runId !== p.runId || !s.token || s.finish) return
  const r = await achFinish(s.token, p.found, p.activeMs)
  useRun.setState(r.ok ? { finish: r.finish, ms: r.ms, error: '' } : { error: r.error })
}

/** Puts this run on the board under `name`. */
export async function submitRun(name: string) {
  const s = useRun.getState()
  if (!s.finish) return { ok: false as const, error: 'nothing to submit' }
  const r = await achSubmit(s.finish, name)
  if (r.ok) useRun.setState({ rank: r.rank, error: '' })
  return r
}

/** Tries finishing again, for when the first attempt hit a network error. */
export const retryFinish = () => finish(getProgress())

let started = false

/** Call once on page load. */
export function initAchievementRun() {
  if (started) return
  started = true
  const p = getProgress()
  const s = useRun.getState()
  if (s.runId !== p.runId) void start(p)
  else if (p.finishedAt && s.token && !s.finish) void finish(p)
  window.addEventListener('achievements:reset', (e) => void start((e as CustomEvent<Progress>).detail))
  onAllFound((p) => void finish(p))
}
