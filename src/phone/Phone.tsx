import { useEffect, useState } from 'react'
import { findProject, findReadme, getNode, projects } from '../fs'
import type { FsNode } from '../fs/types'
import Icon from '../apps/Icon'
import { specFor, WindowContent } from '../apps/registry'
import { registerOpener } from '../shell/opener'
import type { OpenSpec } from '../store/windows'

function StatusBar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="ph-status">
      <span>{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
      <span>danishali.dev</span>
    </div>
  )
}

/** Phone UI: a home screen of app icons; every app opens full screen. */
export default function Phone() {
  // /projects/<name> opens that project's folder (and its README on top).
  const [stack, setStack] = useState<OpenSpec[]>(() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)/)
    const project = match && findProject(decodeURIComponent(match[1]))
    if (!project) return []
    const readme = findReadme(project)
    return readme ? [specFor(project), specFor(readme)] : [specFor(project)]
  })

  useEffect(() => {
    registerOpener(
      (node: FsNode) => setStack((s) => [...s, specFor(node)]),
      () => setStack((s) => [...s, { kind: 'terminal', title: 'Terminal' }]),
    )
  }, [])

  const back = () => setStack((s) => s.slice(0, -1))
  const current = stack[stack.length - 1]
  const about = getNode('/about.md')
  const open = (spec: OpenSpec) => setStack((s) => [...s, spec])

  return (
    <div className="phone">
      <StatusBar />
      {current ? (
        <div className="ph-app">
          <header className="ph-app-bar" style={{ ['--win-color' as string]: current.color }}>
            <button type="button" onClick={back} aria-label="Back">
              ‹ Back
            </button>
            <span>{current.title}</span>
            <button type="button" onClick={() => setStack([])} aria-label="Home">
              Home
            </button>
          </header>
          <div className="ph-app-body">
            <WindowContent
              win={current}
              opts={{
                phone: true,
                onExit: back,
                onNavigate: (path) => {
                  const n = getNode(path)
                  if (n) open(specFor(n))
                },
              }}
            />
          </div>
        </div>
      ) : (
        <main className="ph-home">
          <h1 className="ph-hello">Danish Ali</h1>
          <ul className="ph-grid">
            {projects().map((p) => (
              <li key={p.path}>
                <button type="button" onClick={() => open(specFor(p))}>
                  <Icon node={p} size={56} />
                  <span>{p.meta?.name ?? p.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <nav className="ph-dock" aria-label="Dock">
            <button type="button" onClick={() => open({ kind: 'terminal', title: 'Terminal' })}>
              <Icon node="terminal" size={48} />
              <span>Terminal</span>
            </button>
            {about && (
              <button type="button" onClick={() => open(specFor(about))}>
                <Icon node="about" size={48} />
                <span>About</span>
              </button>
            )}
          </nav>
        </main>
      )}
    </div>
  )
}
