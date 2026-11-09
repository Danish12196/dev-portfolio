import { useEffect, useRef, useState } from 'react'
import { findProject, findReadme, getNode, projects } from '../fs'
import type { FsNode } from '../fs/types'
import Icon from '../apps/Icon'
import { specFor, WindowContent } from '../apps/registry'
import { registerOpener } from '../shell/opener'
import Wallpaper from '../desktop/Wallpaper'
import type { OpenSpec } from '../store/windows'
import { SkyStar } from '../achievements/SkyStar'

function StatusBar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="ph-status" aria-hidden="true">
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
    // After the blue screen or the hack: back to the home screen.
    const home = () => setStack([])
    window.addEventListener('paperos:home', home)
    return () => window.removeEventListener('paperos:home', home)
  }, [])

  // Screen readers and keyboards land on the new screen's title, like a page change.
  const titleRef = useRef<HTMLHeadingElement>(null)
  const depth = stack.length
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    titleRef.current?.focus({ preventScroll: true })
  }, [depth])

  const back = () => setStack((s) => s.slice(0, -1))
  const current = stack[stack.length - 1]
  const about = getNode('/about.md')
  const files = getNode('/projects')
  const open = (spec: OpenSpec) => setStack((s) => [...s, spec])

  return (
    <div className="phone">
      <Wallpaper compact />
      {!current && <SkyStar />}
      <StatusBar />
      {current ? (
        <main className="ph-app">
          <header className="ph-app-bar" style={{ ['--ic-color' as string]: current.color }}>
            <button type="button" className="round-btn" onClick={back} aria-label="Back">
              ‹
            </button>
            <h1 className="ph-app-title" ref={titleRef} tabIndex={-1}>
              {current.title}
            </h1>
            <button type="button" className="ph-home-btn" onClick={() => setStack([])}>
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
        </main>
      ) : (
        <main className="ph-home">
          <div className="ph-hello">
            <div className="ph-kicker">dev/portfolio</div>
            <h1 ref={titleRef} tabIndex={-1}>
              Hi, I&apos;m
              <br />
              Danish
            </h1>
            <p>Apps, games and the odd homelab tool</p>
          </div>
          <ul className="ph-grid">
            {projects().map((p) => (
              <li key={p.path}>
                <button type="button" onClick={() => open(specFor(p))}>
                  <span className="ic ic-xl ic-tile ic-app" style={{ ['--ic-color' as string]: p.meta?.color }} aria-hidden="true">
                    {(p.meta?.name ?? p.name).slice(0, 1).toUpperCase()}
                  </span>
                  <span>{p.meta?.name ?? p.name}</span>
                </button>
              </li>
            ))}
            {about && (
              <li>
                <button type="button" onClick={() => open(specFor(about))}>
                  <span className="ic ic-xl ic-tile ic-about" aria-hidden="true">
                    da
                  </span>
                  <span>About</span>
                </button>
              </li>
            )}
          </ul>
          <nav className="ph-dock" aria-label="Dock">
            <button type="button" onClick={() => open({ kind: 'terminal', title: 'Terminal' })}>
              <Icon node="terminal" size="lg" />
              <span>Terminal</span>
            </button>
            {files && (
              <button type="button" onClick={() => open(specFor(files))}>
                <Icon node={files} size="lg" color="var(--btn-min)" />
                <span>Files</span>
              </button>
            )}
            <a href="https://github.com/Danish12196" target="_blank" rel="noreferrer">
              <span className="ic ic-lg ic-tile ic-contact" aria-hidden="true">
                @
              </span>
              <span>GitHub</span>
            </a>
          </nav>
        </main>
      )}
    </div>
  )
}
