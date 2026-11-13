import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getNode } from '../fs'

export type WindowKind = 'terminal' | 'folder' | 'markdown' | 'text' | 'image' | 'video' | 'pdf' | 'app' | 'cv' | 'guestbook' | 'stats' | 'updates' | 'wallpaper'

export interface Win {
  id: string
  kind: WindowKind
  title: string
  /** File system path the window shows (folder, file), if any. */
  path?: string
  /** For app windows: the live URL. */
  url?: string
  /** Accent colour carried over from the project. */
  color?: string
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
  maximized: boolean
}

export type OpenSpec = Pick<Win, 'kind' | 'title'> & Partial<Pick<Win, 'path' | 'url' | 'color' | 'w' | 'h'>>

interface WindowState {
  windows: Win[]
  topZ: number
  open: (spec: OpenSpec) => string
  close: (id: string) => void
  focus: (id: string) => void
  minimize: (id: string) => void
  toggleMaximize: (id: string) => void
  setBounds: (id: string, b: Partial<Pick<Win, 'x' | 'y' | 'w' | 'h'>>) => void
  update: (id: string, patch: Partial<Win>) => void
  /** Put every window back at its default size, cascaded from the centre, in its current stacking order. */
  resetLayout: () => void
  /** Keep every window reachable after the viewport changes size. */
  fitAll: () => void
}

const DEFAULT_SIZE: Record<WindowKind, [number, number]> = {
  terminal: [720, 440],
  folder: [620, 420],
  markdown: [640, 560],
  text: [560, 420],
  image: [760, 540],
  video: [760, 480],
  pdf: [720, 640],
  app: [1024, 680],
  wallpaper: [620, 600],
  stats: [660, 620],
  cv: [780, 680],
  guestbook: [600, 640],
  updates: [560, 600],
}

let counter = 0

/** Kinds that only ever have one window. */
const SINGLETONS = new Set<WindowKind>(['terminal', 'guestbook', 'stats', 'updates'])

const TASKBAR = 54
const STEP = 32

/** Centred, or cascaded down and right from the window on top so its title bar stays visible. */
function place(w: number, h: number, below?: Win) {
  const vw = window.innerWidth
  const vh = window.innerHeight - TASKBAR
  const width = Math.min(w, vw - 24)
  const height = Math.min(h, vh - 24)
  const centred = { x: Math.max(12, Math.round((vw - width) / 2)), y: Math.max(12, Math.round((vh - height) / 2)) }
  if (below) {
    const x = below.x + STEP
    const y = below.y + STEP
    if (x + width <= vw - 12 && y + height <= vh - 12) return { w: width, h: height, x, y }
    // No room to cascade: start again from the top left corner of the free area.
    if (Math.abs(centred.x - below.x) < STEP && Math.abs(centred.y - below.y) < STEP) return { w: width, h: height, x: Math.max(12, Math.min(12 + STEP, vw - width - 12)), y: 12 }
  }
  return { w: width, h: height, ...centred }
}

/** Pull a window back on screen after the browser window shrinks. */
function fit(win: Win): Win {
  const vw = window.innerWidth
  const vh = window.innerHeight - TASKBAR
  const w = Math.min(win.w, Math.max(320, vw - 24))
  const h = Math.min(win.h, Math.max(200, vh - 24))
  const x = Math.min(Math.max(win.x, -w + 80), vw - 80)
  const y = Math.min(Math.max(win.y, 0), vh - 60)
  return x === win.x && y === win.y && w === win.w && h === win.h ? win : { ...win, x, y, w, h }
}

export const useWindows = create<WindowState>()(
  persist(
    (set, get) => ({
      windows: [],
      topZ: 1,

      open: (spec) => {
        const { windows, topZ } = get()
        // One window per thing: reopening focuses the existing window.
        const existing = windows.find(
          (w) => w.kind === spec.kind && (SINGLETONS.has(spec.kind) || (w.path ?? w.url) === (spec.path ?? spec.url)),
        )
        if (existing) {
          set({
            topZ: topZ + 1,
            windows: windows.map((w) => (w.id === existing.id ? { ...w, minimized: false, z: topZ + 1 } : w)),
          })
          return existing.id
        }
        const [dw, dh] = DEFAULT_SIZE[spec.kind]
        const below = windows.find((w) => w.id === topWindowId(windows))
        const id = `w${Date.now().toString(36)}${counter++}`
        const win: Win = {
          id,
          minimized: false,
          maximized: false,
          z: topZ + 1,
          ...spec,
          // Placed last so a requested size (a game's) is still clamped to the screen.
          ...place(spec.w ?? dw, spec.h ?? dh, below),
        }
        set({ topZ: topZ + 1, windows: [...windows, win] })
        return id
      },

      close: (id) => set({ windows: get().windows.filter((w) => w.id !== id) }),

      focus: (id) => {
        const { windows, topZ } = get()
        const target = windows.find((w) => w.id === id)
        if (!target || (target.z === topZ && !target.minimized)) return
        set({ topZ: topZ + 1, windows: windows.map((w) => (w.id === id ? { ...w, z: topZ + 1, minimized: false } : w)) })
      },

      minimize: (id) => set({ windows: get().windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)) }),

      toggleMaximize: (id) =>
        set({ windows: get().windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)) }),

      setBounds: (id, b) => set({ windows: get().windows.map((w) => (w.id === id ? { ...w, ...b } : w)) }),

      update: (id, patch) => set({ windows: get().windows.map((w) => (w.id === id ? { ...w, ...patch } : w)) }),

      resetLayout: () => {
        const placed: Win[] = []
        for (const w of [...get().windows].sort((a, b) => a.z - b.z)) {
          const [dw, dh] = DEFAULT_SIZE[w.kind]
          // Games keep the size they were built for.
          const size = w.kind === 'app' && w.title.endsWith('(play)') ? [w.w, w.h] : [dw, dh]
          placed.push({ ...w, minimized: false, maximized: false, ...place(size[0], size[1], placed[placed.length - 1]) })
        }
        const order = new Map(placed.map((w) => [w.id, w]))
        set({ windows: get().windows.map((w) => order.get(w.id) ?? w) })
      },

      fitAll: () => {
        const windows = get().windows
        const next = windows.map(fit)
        if (next.some((w, i) => w !== windows[i])) set({ windows: next })
      },
    }),
    {
      name: 'devportfolio.windows',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const valid = state.windows.filter((w) => !w.path || Boolean(getNode(w.path)))
        if (valid.length !== state.windows.length) state.windows = valid
      },
    },
  ),
)

/** The id of the window on top, ignoring minimised ones. */
export function topWindowId(windows: Win[]) {
  return windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id
}
