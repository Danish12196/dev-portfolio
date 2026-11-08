import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WindowKind = 'terminal' | 'folder' | 'markdown' | 'text' | 'image' | 'video' | 'pdf' | 'app'

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
}

let counter = 0

function place(w: number, h: number, offset: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight - 28 - 72 // menu bar + dock
  const width = Math.min(w, vw - 24)
  const height = Math.min(h, vh - 24)
  return {
    w: width,
    h: height,
    x: Math.max(12, Math.round((vw - width) / 2) + offset),
    y: Math.max(12, Math.round((vh - height) / 2) + offset),
  }
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
          (w) => w.kind === spec.kind && (spec.kind === 'terminal' || (w.path ?? w.url) === (spec.path ?? spec.url)),
        )
        if (existing) {
          set({
            topZ: topZ + 1,
            windows: windows.map((w) => (w.id === existing.id ? { ...w, minimized: false, z: topZ + 1 } : w)),
          })
          return existing.id
        }
        const [dw, dh] = DEFAULT_SIZE[spec.kind]
        const offset = (windows.filter((w) => !w.minimized).length % 6) * 28
        const id = `w${Date.now().toString(36)}${counter++}`
        const win: Win = {
          id,
          minimized: false,
          maximized: false,
          z: topZ + 1,
          ...place(spec.w ?? dw, spec.h ?? dh, offset),
          ...spec,
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
    }),
    { name: 'devportfolio.windows', version: 1 },
  ),
)

/** The id of the window on top, ignoring minimised ones. */
export function topWindowId(windows: Win[]) {
  return windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id
}
