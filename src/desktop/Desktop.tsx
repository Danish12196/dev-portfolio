import { useEffect, useRef, useState } from 'react'
import { getNode, projects } from '../fs'
import type { DirNode, FsNode } from '../fs/types'
import { specFor, WindowContent } from '../apps/registry'
import Icon from '../apps/Icon'
import { openNode, openTerminal, registerOpener } from '../shell/opener'
import { useTheme } from '../shell/theme'
import { topWindowId, useWindows, type Win } from '../store/windows'
import Wallpaper from './Wallpaper'
import { Star } from '../achievements/Notepad'
import { SkyStar } from '../achievements/SkyStar'
import { restart, shutdown } from '../achievements/effects'
import Window from './Window'

const GITHUB = 'https://github.com/Danish12196'

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return (
    <time className="tb-clock" dateTime={now.toISOString()}>
      <span>{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
      <span className="tb-date">{now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
    </time>
  )
}

function StartMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const about = getNode('/about.md')
  // Move focus into the menu, and give it back to the start button when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const menu = ref.current
    menu?.querySelector<HTMLElement>('button, a')?.focus()
    return () => {
      const now = document.activeElement
      if (!now || now === document.body || menu?.contains(now)) opener?.focus()
    }
  }, [])
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('.tb-start')) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      // Up/down arrows walk the menu like a native one.
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const items = [...(ref.current?.querySelectorAll<HTMLElement>('button, a') ?? [])]
      const at = items.indexOf(document.activeElement as HTMLElement)
      if (at === -1 && !ref.current?.contains(document.activeElement)) return
      e.preventDefault()
      const next = e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length
      items[next]?.focus()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  const go = (n: FsNode) => {
    openNode(n)
    onClose()
  }
  return (
    <div className="start-menu" id="start-menu" ref={ref} role="dialog" aria-label="Start menu">
      <div className="sm-profile">
        <span className="sm-avatar" aria-hidden="true">
          da
        </span>
        <div>
          <div className="sm-name">Danish Ali</div>
          <div className="sm-sub">Apps, games and the odd homelab tool</div>
        </div>
        <Star id="star-menu" className="star-menu" />
      </div>
      <div className="sm-label">PROJECTS</div>
      <ul className="sm-list">
        {projects().map((p) => (
          <li key={p.path}>
            <button type="button" onClick={() => go(p)} style={{ ['--ic-color' as string]: p.meta?.color }}>
              <span className="sm-swatch" />
              {p.meta?.name ?? p.name}
              <span className="sm-year">{p.meta?.year}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sm-actions">
        {about && (
          <button type="button" className="pill pill-dark" onClick={() => go(about)}>
            About me
          </button>
        )}
        <button type="button" className="pill" onClick={() => (openTerminal(), onClose())}>
          Terminal
        </button>
        <a className="pill" href={GITHUB} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
      <div className="sm-power">
        <button type="button" onClick={() => (onClose(), restart())}>
          <span aria-hidden="true">↻</span> Restart
        </button>
        <button type="button" onClick={() => (onClose(), shutdown())}>
          <span aria-hidden="true">⏻</span> Shut down
        </button>
      </div>
    </div>
  )
}

function Search() {
  const [q, setQ] = useState('')
  const hits = q.trim()
    ? projects().filter((p) =>
        [p.name, p.meta?.name, p.meta?.tagline, ...(p.meta?.stack ?? [])].join(' ').toLowerCase().includes(q.trim().toLowerCase()),
      )
    : []
  const open = (p: DirNode) => {
    openNode(p)
    setQ('')
  }
  return (
    <div className="tb-search-wrap" role="search">
      <label className="tb-search" htmlFor="tb-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="tb-search"
          type="search"
          placeholder="Search projects"
          aria-label="Search projects"
          aria-controls={q.trim() ? 'tb-results' : undefined}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hits[0]) open(hits[0])
            if (e.key === 'Escape') setQ('')
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              document.querySelector<HTMLElement>('#tb-results button')?.focus()
            }
          }}
          autoComplete="off"
        />
      </label>
      {q.trim() && (
        <ul
          className="tb-results"
          id="tb-results"
          aria-label="Matching projects"
          onKeyDown={(e) => {
            const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button')]
            const at = items.indexOf(document.activeElement as HTMLElement)
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              const next = at + (e.key === 'ArrowDown' ? 1 : -1)
              ;(next < 0 ? document.getElementById('tb-search') : items[Math.min(next, items.length - 1)])?.focus()
            }
            if (e.key === 'Escape') {
              setQ('')
              document.getElementById('tb-search')?.focus()
            }
          }}
        >
          {hits.length === 0 && <li className="tb-none">No projects match “{q.trim()}”</li>}
          {hits.map((p) => (
            <li key={p.path}>
              <button type="button" onClick={() => open(p)} style={{ ['--ic-color' as string]: p.meta?.color }}>
                <span className="sm-swatch" />
                <span>{p.meta?.name ?? p.name}</span>
                <span className="tb-tagline">{p.meta?.tagline}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Taskbar({ windows }: { windows: Win[] }) {
  const { focus, minimize } = useWindows()
  const [theme, setTheme] = useTheme()
  const [start, setStart] = useState(false)
  const top = topWindowId(windows)
  return (
    <>
      {start && <StartMenu onClose={() => setStart(false)} />}
      <nav className="taskbar" aria-label="Taskbar">
        <button
          type="button"
          className="tb-start"
          aria-expanded={start}
          aria-haspopup="dialog"
          aria-controls={start ? 'start-menu' : undefined}
          onClick={() => setStart(!start)}
        >
          <span className="sm-avatar sm-avatar-sm" aria-hidden="true">
            da
          </span>
          dev/portfolio
        </button>
        <Search />
        <span className="tb-sep" aria-hidden="true" />
        <div className="tb-windows" role="group" aria-label="Open windows">
          {windows.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`tb-win${w.minimized ? ' min' : ''}${w.id === top ? ' on' : ''}`}
              onClick={() => (w.id === top && !w.minimized ? minimize(w.id) : focus(w.id))}
              title={w.minimized ? `${w.title} (minimised)` : w.title}
              aria-pressed={w.id === top && !w.minimized}
              aria-label={w.minimized ? `${w.title}, minimised` : w.title}
              style={{ ['--ic-color' as string]: w.color }}
            >
              <span className={`win-glyph win-glyph-${w.kind}`} aria-hidden="true" />
              <span className="tb-win-title">{w.title}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="tb-theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <Clock />
      </nav>
    </>
  )
}

function DeskIcon({ node, label, onOpen, color }: { node: FsNode | 'terminal'; label: string; onOpen: () => void; color?: string }) {
  return (
    <li>
      <button
        type="button"
        className="desk-icon"
        onDoubleClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
        onClick={(e) => (e.nativeEvent as PointerEvent).pointerType === 'touch' && onOpen()}
      >
        <Icon node={node} size="lg" color={color} />
        <span className="desk-label">{label}</span>
      </button>
    </li>
  )
}

export default function Desktop() {
  const { windows, open, close, update, fitAll } = useWindows()

  useEffect(() => {
    fitAll()
    window.addEventListener('resize', fitAll)
    return () => window.removeEventListener('resize', fitAll)
  }, [fitAll])

  useEffect(() => {
    registerOpener(
      (node: FsNode) => void open(specFor(node)),
      () => void open({ kind: 'terminal', title: 'Terminal' }),
    )
  }, [open])

  const top = topWindowId(windows)
  const about = getNode('/about.md')

  return (
    <div className="desktop">
      <Wallpaper />
      <SkyStar />
      <main className="workspace">
        <h1 className="sr-only">Danish Ali, dev portfolio</h1>
        <ul className="desk-icons" aria-label="Desktop">
          {projects().map((p) => (
            <DeskIcon key={p.path} node={p} label={p.name} onOpen={() => openNode(p)} />
          ))}
          <DeskIcon node="terminal" label="terminal" onOpen={openTerminal} />
          {about && <DeskIcon node={about} label="about me" onOpen={() => openNode(about)} />}
        </ul>
        {windows.length === 0 && <p className="desk-hint">Double-click a folder (or select it and press Enter) to open it. The dev/portfolio button opens the start menu.</p>}
        {windows.map((w) => (
          <Window key={w.id} win={w} active={w.id === top}>
            <WindowContent
              win={w}
              opts={{
                onExit: () => close(w.id),
                onNavigate: (path) => {
                  const n = getNode(path)
                  if (n?.type === 'dir') update(w.id, { path, title: n.meta?.name ?? specFor(n).title, color: n.meta?.color ?? w.color })
                },
              }}
            />
          </Window>
        ))}
      </main>
      <Taskbar windows={windows} />
    </div>
  )
}

