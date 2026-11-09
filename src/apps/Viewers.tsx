import { marked } from 'marked'
import { useEffect, useMemo, useRef, useState } from 'react'
import { findApp, getNode, projectAt } from '../fs'
import type { DirNode, FileNode } from '../fs/types'
import { openNode } from '../shell/opener'

marked.use({ gfm: true })

function fileAt(path?: string): FileNode | undefined {
  const n = path ? getNode(path) : undefined
  return n?.type === 'file' ? n : undefined
}

/** The project a README introduces: its folder, when that folder has a project.json. */
function projectOf(path: string): DirNode | undefined {
  if (!/\/readme\.md$/i.test(path)) return undefined
  const dir = getNode(path.slice(0, path.lastIndexOf('/')))
  return dir?.type === 'dir' && dir.meta ? dir : undefined
}

/** A link file's button label: github.link reads "GitHub", itch.link "itch.io". */
function linkLabel(l: FileNode) {
  return l.name.replace(/\.link$/, '').replace(/^github$/i, 'GitHub').replace(/^itch$/i, 'itch.io')
}

function ProjectHeader({ dir }: { dir: DirNode }) {
  const meta = dir.meta!
  const app = findApp(dir)
  const links = dir.children.filter((c): c is FileNode => c.type === 'file' && c.kind === 'link')
  const live = app?.type === 'file' && app.url ? new URL(app.url).host : undefined
  // itch.io won't let its games be embedded here, so a game's main button sends you to its itch.io page.
  const itch = !app ? links.find((l) => /^itch\.link$/i.test(l.name) && l.url) : undefined
  const game = Boolean(itch && meta.jam)
  return (
    <header className="proj-head" style={{ ['--ic-color' as string]: meta.color }}>
      {meta.cover && <img className="proj-cover" src={meta.cover} alt={`${meta.name} cover art`} />}
      <div className="proj-title">
        <span className="ic ic-lg ic-tile ic-app" aria-hidden="true">
          {meta.name.slice(0, 1)}
        </span>
        <div>
          <h1>{meta.name}</h1>
          {meta.tagline && <p>{meta.tagline}</p>}
        </div>
      </div>
      <div className="proj-chips">
        {meta.year && <span className="chip">{meta.year}</span>}
        {meta.stack?.length ? <span className="chip">{meta.stack.join(' · ')}</span> : null}
        {meta.jam && <span className="chip">{meta.jam}</span>}
        {live && <span className="chip chip-live">● live at {live}</span>}
        {game && <span className="chip chip-live">▶ playable on itch.io</span>}
      </div>
      <div className="proj-actions">
        {app && (
          <button type="button" className="pill pill-dark" onClick={() => openNode(app)}>
            Open {meta.name}
          </button>
        )}
        {itch && (
          <a className="pill pill-dark" href={itch.url} target="_blank" rel="noreferrer">
            {game ? `Play ${meta.name}` : 'itch.io'} ↗
          </a>
        )}
        {links
          .filter((l) => l !== itch)
          .map((l) => (
            <a key={l.path} className="pill" href={l.url} target="_blank" rel="noreferrer">
              {linkLabel(l)} ↗
            </a>
          ))}
      </div>
    </header>
  )
}

export function MarkdownView({ path }: { path?: string }) {
  const file = fileAt(path)
  const project = file ? projectOf(file.path) : undefined
  // Content comes from this repo's own content/ folder, so it is trusted HTML.
  const html = useMemo(() => {
    if (!file?.text) return ''
    // The project header already shows the title, so drop the README's first heading.
    const text = project ? file.text.replace(/^\s*(<!--[\s\S]*?-->\s*)*#\s.*\n/, '') : file.text
    return marked.parse(text) as string
  }, [file, project])
  if (!file) return <Missing />
  return (
    <div className="doc-wrap">
      {project && <ProjectHeader dir={project} />}
      <article
        className="doc"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={(e) => {
          const a = (e.target as HTMLElement).closest('a')
          if (a && a.host !== location.host) {
            e.preventDefault()
            window.open(a.href, '_blank', 'noopener,noreferrer')
          }
        }}
      />
    </div>
  )
}

export function TextView({ path }: { path?: string }) {
  const file = fileAt(path)
  if (!file) return <Missing />
  return <pre className="plain">{file.text}</pre>
}

/** "02-accuracy-by-size.png" -> "Accuracy by size" */
function altFor(file: FileNode) {
  const words = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[-_ ]*/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
  const project = projectAt(file.path)?.meta?.name
  const text = words ? words.charAt(0).toUpperCase() + words.slice(1) : file.name
  return project ? `${project}: ${text}` : text
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

export function ImageView({ path }: { path?: string }) {
  const file = fileAt(path)
  const ref = useRef<HTMLDivElement>(null)
  const siblings = useMemo(() => {
    if (!file) return []
    const dir = getNode(file.path.slice(0, file.path.lastIndexOf('/')) || '/')
    return dir?.type === 'dir' ? dir.children.filter((c): c is FileNode => c.type === 'file' && c.kind === 'image') : [file]
  }, [file])
  const [i, setI] = useState(() => Math.max(0, siblings.findIndex((s) => s.path === file?.path)))
  const n = siblings.length
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only the window on top flips pictures, and never while someone is typing.
      const host = ref.current?.closest('.win')
      if ((host && !host.classList.contains('active')) || isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowRight') setI((v) => (v + 1) % n)
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + n) % n)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [n])
  // Warm the cache for the neighbours so flipping feels instant.
  useEffect(() => {
    if (n < 2) return
    for (const j of [i + 1, i - 1]) {
      const src = siblings[(j + n) % n]?.src
      if (src) new Image().src = src
    }
  }, [i, n, siblings])
  const current = siblings[i]
  if (!current) return <Missing />
  return (
    <div className="imgview" ref={ref}>
      <img
        key={current.src}
        src={current.src}
        alt={altFor(current)}
        width={current.width}
        height={current.height}
        decoding="async"
      />
      {(n > 1 || current.full) && (
        <div className="imgview-bar">
          {n > 1 && (
            <button type="button" onClick={() => setI((i - 1 + n) % n)} aria-label="Previous image">
              ←
            </button>
          )}
          <span aria-live="polite">
            {current.name}
            {n > 1 && ` · ${i + 1}/${n}`}
          </span>
          {n > 1 && (
            <button type="button" onClick={() => setI((i + 1) % n)} aria-label="Next image">
              →
            </button>
          )}
          {current.full && (
            <a className="imgview-full" href={current.full} target="_blank" rel="noreferrer">
              Full size ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function VideoView({ path }: { path?: string }) {
  const file = fileAt(path)
  if (!file) return <Missing />
  return <video className="media" src={file.src} poster={file.poster} controls playsInline preload="metadata" />
}

export function PdfView({ path }: { path?: string }) {
  const file = fileAt(path)
  if (!file) return <Missing />
  return (
    <div className="pdfview">
      <object data={file.src} type="application/pdf" aria-label={file.name}>
        <p>
          This browser can't show PDFs inline. <a href={file.src} download>Download {file.name}</a>
        </p>
      </object>
    </div>
  )
}

export function AppFrame({ url, title }: { url?: string; title: string }) {
  const [loaded, setLoaded] = useState(false)
  if (!url) return <Missing />
  return (
    <div className="appframe">
      {!loaded && <div className="appframe-loading">Starting {title}…</div>}
      <iframe src={url} title={title} onLoad={() => setLoaded(true)} allow="fullscreen; clipboard-write" />
      <a className="appframe-out" href={url} target="_blank" rel="noreferrer">Open in a new tab ↗</a>
    </div>
  )
}

function Missing() {
  return <p className="missing">This file has moved or no longer exists.</p>
}
