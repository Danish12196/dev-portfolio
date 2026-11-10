import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Offset {
  x: number
  y: number
  /** Stacking order among moved things: the one moved last sits on top. */
  z?: number
}

interface LayoutState {
  /** How far each draggable thing (icon, note, notepad) was moved from its usual spot, by id. */
  offsets: Record<string, Offset>
  /** `keepOrder` leaves the stacking order alone (for automatic nudges back on screen). */
  setOffset: (id: string, o: Offset, keepOrder?: boolean) => void
  /** Put everything back where it started. */
  reset: () => void
}

export const useLayout = create<LayoutState>()(
  persist(
    (set, get) => ({
      offsets: {},
      setOffset: (id, o, keepOrder) => {
        const offsets = { ...get().offsets }
        if (o.x === 0 && o.y === 0) delete offsets[id]
        else offsets[id] = { x: Math.round(o.x), y: Math.round(o.y), z: keepOrder ? offsets[id]?.z : 1 + Math.max(0, ...Object.values(offsets).map((v) => v.z ?? 0)) }
        set({ offsets })
      },
      reset: () => set({ offsets: {} }),
    }),
    { name: 'devportfolio.layout', version: 1 },
  ),
)
