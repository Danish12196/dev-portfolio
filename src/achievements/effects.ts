// Full-screen gags: the blue screen after rm -rf, the hack, restart, shutdown and the fake blog login.
import { create } from 'zustand'
import { openTerminal } from '../shell/opener'
import { useWindows } from '../store/windows'
import { useTerm } from '../terminal/store'
import { txt } from '../terminal/lines'
import { unlock } from '.'

export type Takeover = 'bsod' | 'hack' | 'restart' | 'shutdown' | 'wordpress'

export const useTakeover = create<{ mode: Takeover | null }>()(() => ({ mode: null }))

export function takeover(mode: Takeover | null) {
  useTakeover.setState({ mode })
}

const GOTCHA: Partial<Record<Takeover, string[]>> = {
  bsod: ['haha… did I get you?', 'Nothing was deleted. Everything is right where you left it.'],
  hack: ['haha… did I get you?', 'Nobody hacked anything. The "mainframe" is a React app, and the projects were public anyway.'],
}

/** Close every window, open a fresh terminal and leave a note in it. */
export function goHome(from: Takeover) {
  document.documentElement.removeAttribute('data-wipe')
  takeover(null)
  useWindows.setState({ windows: [] })
  window.dispatchEvent(new Event('paperos:home'))
  const note = GOTCHA[from]
  if (note) {
    useTerm.setState({ lines: [], cwd: '/', handler: null, program: null })
    useTerm.getState().push([txt(note[0], 'bold')], [txt(note[1], 'dim')], [])
  }
  openTerminal()
  if (from === 'bsod') unlock('rm')
  if (from === 'hack') unlock('hack')
}

/** rm -rf /: the desktop empties out, then the blue screen. */
export function wipe(afterMs: number) {
  setTimeout(() => {
    document.documentElement.dataset.wipe = '1'
  }, Math.max(0, afterMs - 1400))
  setTimeout(() => takeover('bsod'), afterMs)
}

/** Restart: a short "restarting" screen, every window closed, then a real reload. */
export function restart() {
  unlock('restart')
  takeover('restart')
  setTimeout(() => {
    useWindows.setState({ windows: [] })
    location.assign('/')
  }, 1800)
}

export function shutdown() {
  takeover('shutdown')
}
