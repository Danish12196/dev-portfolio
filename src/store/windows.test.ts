import { beforeEach, describe, expect, it } from 'vitest'
import { topWindowId, useWindows } from './windows'

describe('windows store', () => {
  beforeEach(() => {
    localStorage.clear()
    useWindows.setState({ windows: [], topZ: 1 })
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
  })

  it('opens a window and focuses instead of duplicating singletons or same-path windows', () => {
    const id1 = useWindows.getState().open({ kind: 'terminal', title: 'Terminal' })
    const id2 = useWindows.getState().open({ kind: 'terminal', title: 'Terminal' })
    expect(id2).toBe(id1)
    expect(useWindows.getState().windows).toHaveLength(1)

    const f1 = useWindows.getState().open({ kind: 'markdown', path: '/about.md', title: 'about.md' })
    const f2 = useWindows.getState().open({ kind: 'markdown', path: '/about.md', title: 'about.md' })
    expect(f2).toBe(f1)
    expect(useWindows.getState().windows).toHaveLength(2)
  })

  it('minimizes, maximizes, focuses, and closes windows', () => {
    const id1 = useWindows.getState().open({ kind: 'terminal', title: 'Terminal' })
    const id2 = useWindows.getState().open({ kind: 'folder', path: '/projects', title: 'Projects' })
    expect(topWindowId(useWindows.getState().windows)).toBe(id2)

    useWindows.getState().minimize(id2)
    expect(topWindowId(useWindows.getState().windows)).toBe(id1)

    useWindows.getState().focus(id2)
    expect(useWindows.getState().windows.find((w) => w.id === id2)?.minimized).toBe(false)
    expect(topWindowId(useWindows.getState().windows)).toBe(id2)

    useWindows.getState().toggleMaximize(id2)
    expect(useWindows.getState().windows.find((w) => w.id === id2)?.maximized).toBe(true)

    useWindows.getState().close(id1)
    expect(useWindows.getState().windows).toHaveLength(1)
  })

  it('clamps out-of-bounds windows with fitAll', () => {
    const id = useWindows.getState().open({ kind: 'terminal', title: 'Terminal' })
    useWindows.getState().setBounds(id, { x: 2000, y: 2000, w: 720, h: 440 })
    useWindows.getState().fitAll()
    const win = useWindows.getState().windows.find((w) => w.id === id)!
    expect(win.x).toBeLessThan(1280)
    expect(win.y).toBeLessThan(800)
  })

  it('prunes stale persisted windows whose paths no longer exist on rehydrate', async () => {
    localStorage.setItem(
      'devportfolio.windows',
      JSON.stringify({
        state: {
          topZ: 5,
          windows: [
            { id: 'w1', kind: 'terminal', title: 'Terminal', x: 10, y: 10, w: 600, h: 400, z: 2, minimized: false, maximized: false },
            { id: 'w2', kind: 'markdown', path: '/about.md', title: 'about.md', x: 20, y: 20, w: 600, h: 400, z: 3, minimized: false, maximized: false },
            { id: 'w3', kind: 'markdown', path: '/deleted-file.md', title: 'deleted', x: 30, y: 30, w: 600, h: 400, z: 4, minimized: false, maximized: false },
          ],
        },
        version: 1,
      }),
    )

    await useWindows.persist.rehydrate()
    const ids = useWindows.getState().windows.map((w) => w.id)
    expect(ids).toEqual(['w1', 'w2'])
  })
})
