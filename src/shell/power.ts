import { create } from 'zustand'
import { useTerm } from '../terminal/store'
import { useWindows } from '../store/windows'

/**
 * The machine's power state. The boot screen shows whenever `phase` isn't 'on'.
 *
 * `boots` counts boots in this page load, so anything that should happen once the
 * desktop is fresh (opening the terminal, say) can watch it.
 */
export type Phase = 'post' | 'splash' | 'on'

interface PowerState {
  phase: Phase
  /** A short boot skips the BIOS text: reloads in the same tab, and reduced motion. */
  short: boolean
  boots: number
  setPhase: (p: Phase) => void
}

const SESSION_KEY = 'devportfolio.booted'

function bootedBefore() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export const usePower = create<PowerState>()((set) => ({
  phase: 'post',
  short: bootedBefore() || reducedMotion(),
  boots: 1,
  setPhase: (phase) => {
    if (phase === 'on') {
      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* storage blocked */
      }
    }
    set({ phase })
  },
}))

/**
 * Restart the machine: every window closes, the terminal forgets its session,
 * the URL goes back to / and the full boot sequence plays again.
 */
export function restart() {
  useWindows.setState({ windows: [], topZ: 1 })
  useTerm.setState({ lines: [], cwd: '/', handler: null, program: null })
  if (location.pathname !== '/') history.replaceState(null, '', '/')
  usePower.setState((s) => ({ phase: 'post', short: reducedMotion(), boots: s.boots + 1 }))
}
