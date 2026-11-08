import { useEffect, useState } from 'react'
import { getNode, projects } from '../fs'
import type { FsNode } from '../fs/types'
import { specFor, WindowContent } from '../apps/registry'
import Icon from '../apps/Icon'
import { openNode, openTerminal, registerOpener } from '../shell/opener'
import { useTheme } from '../shell/theme'
import { topWindowId, useWindows, type Win } from '../store/windows'
import Window from './Window'

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return (
    <time dateTime={now.toISOString()}>
      {now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
      {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
    </time>
  )
}

function MenuBar() {
  const [theme, setTheme] = useTheme()
  const [menu, setMenu] = useState(false)
  const about = getNode('/about.md')
  return (
    <nav className="menubar" aria-label="Menu bar">
      <button type="button" className="menubar-brand" onClick={() => about && openNode(about)}>
        Dev portfolio
      </button>
      <div className="menubar-menu">
        <button type="button" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          Projects
        </button>
        {menu && (
          <ul className="dropdown" onMouseLeave={() => setMenu(false)}>
            {projects().map((p) => (
              <li key={p.path}>
                <button type="button" onClick={() => (openNode(p), setMenu(false))}>
                  <span className="dot" style={{ background: p.meta?.color }} />
                  {p.meta?.name ?? p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" onClick={openTerminal}>
        Terminal
      </button>
      <span className="menubar-spacer" />
      <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle light and dark">
        {theme === 'dark' ? '☾ dark' : '☀ light'}
      </button>
      <Clock />
    </nav>
  )
}

function Dock({ windows }: { windows: Win[] }) {
  const { focus, minimize } = useWindows()
  const top = topWindowId(windows)
  const projectsDir = getNode('/projects')
  return (
    <nav className="dock" aria-label="Dock">
      <button type="button" className="dock-item" onClick={openTerminal} title="Terminal">
        <Icon node="terminal" size={36} />
        {windows.some((w) => w.kind === 'terminal') && <span className="dock-dot" />}
      </button>
      {projectsDir && (
        <button type="button" className="dock-item" onClick={() => openNode(projectsDir)} title="Projects">
          <Icon node={projectsDir} size={36} />
        </button>
      )}
      {windows.some((w) => w.kind !== 'terminal') && <span className="dock-sep" />}
      {windows
        .filter((w) => w.kind !== 'terminal')
        .map((w) => (
          <button
            key={w.id}
            type="button"
            className={`dock-win${w.minimized ? ' min' : ''}${w.id === top ? ' on' : ''}`}
            onClick={() => (w.id === top && !w.minimized ? minimize(w.id) : focus(w.id))}
            title={w.title}
            style={{ ['--win-color' as string]: w.color }}
          >
            {w.title}
          </button>
        ))}
    </nav>
  )
}

export default function Desktop() {
  const { windows, open, close, update } = useWindows()

  useEffect(() => {
    registerOpener(
      (node: FsNode) => void open(specFor(node)),
      () => void open({ kind: 'terminal', title: 'Terminal' }),
    )
  }, [open])

  const top = topWindowId(windows)
  const items: FsNode[] = [...projects(), ...(getNode('/about.md') ? [getNode('/about.md') as FsNode] : [])]

  return (
    <div className="desktop">
      <MenuBar />
      <main className="workspace">
        <ul className="desk-icons" aria-label="Desktop">
          <li>
            <button type="button" className="file" onDoubleClick={openTerminal} onKeyDown={(e) => e.key === 'Enter' && openTerminal()}>
              <Icon node="terminal" />
              <span className="file-name">Terminal</span>
            </button>
          </li>
          {items.map((n) => (
            <li key={n.path}>
              <button type="button" className="file" onDoubleClick={() => openNode(n)} onKeyDown={(e) => e.key === 'Enter' && openNode(n)}>
                <Icon node={n} />
                <span className="file-name">{n.type === 'dir' ? n.meta?.name ?? n.name : n.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {windows.length === 0 && <p className="desk-hint">Double-click a folder to open it, or reopen the Terminal from the dock.</p>}
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
      <Dock windows={windows} />
    </div>
  )
}
