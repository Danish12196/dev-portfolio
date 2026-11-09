import { create } from 'zustand'
import type { Line } from './lines'

/** Full-screen programs that take over the terminal until you quit them. */
export type Program = 'snake' | 'matrix'
/** Terminal colour schemes. Green is the default and comes back on every reload. */
export type Skin = 'green' | 'amber' | 'ice' | 'mono' | 'rainbow'

/** While set, the next line typed goes here instead of to the shell (vim, sudo, guess). */
export interface InputHandler {
  prompt: string
  /** Hide what is typed, like a password prompt. */
  secret?: boolean
  /** Printed on Ctrl+C instead of leaving, for programs that are hard to quit on purpose. */
  trap?: string
  onInput: (line: string) => void
}

interface TermState {
  lines: Line[]
  cwd: string
  history: string[]
  handler: InputHandler | null
  program: Program | null
  skin: Skin
  push: (...l: Line[]) => void
  clear: () => void
  setCwd: (p: string) => void
  addHistory: (cmd: string) => void
  capture: (h: InputHandler | null) => void
  launch: (p: Program | null) => void
  setSkin: (s: Skin) => void
}

// Lives outside the window so closing and reopening the terminal keeps its scrollback.
export const useTerm = create<TermState>()((set) => ({
  lines: [],
  cwd: '/',
  history: [],
  handler: null,
  program: null,
  skin: 'green',
  push: (...l) => set((s) => ({ lines: [...s.lines, ...l].slice(-500) })),
  clear: () => set({ lines: [] }),
  setCwd: (cwd) => set({ cwd }),
  addHistory: (cmd) => set((s) => ({ history: [...s.history, cmd].slice(-100) })),
  capture: (handler) => set({ handler }),
  launch: (program) => set({ program }),
  setSkin: (skin) => set({ skin }),
}))

/** Print from a timer, after the command that started it has returned. */
export const later = (ms: number, ...l: Line[]) => setTimeout(() => useTerm.getState().push(...l), ms)
