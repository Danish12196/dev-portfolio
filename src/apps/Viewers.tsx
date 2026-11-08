import { marked } from 'marked'
import { useEffect, useMemo, useState } from 'react'
import { findApp, getNode } from '../fs'
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

function ProjectHeader({ dir }: { dir: DirNode }) {
  const meta = dir.meta!
  const app = findApp(dir)
  const links = dir.children.filter((c): c is FileNode => c.type === 'file' && c.kind === 'link')
  const live = app?.type === 'file' && app.url ? new URL(app.url).host : undefined
  return (
    <header className="proj-head" style={{ ['--ic-color' as string]: meta.color }}>
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
        {live && <span className="chip chip-live">● live at {live}</span>}
      </div>
      <div className="proj-actions">
        {app && (
          <button type="button" className="pill pill-dark" onClick={() => openNode(app)}>
            Open {meta.name}
          </button>
        )}
        {links.map((l) => (
          <a key={l.path} className="pill" href={l.url} target="_blank" rel="noreferrer">
            {l.name.replace(/\.link$/, '').replace(/^github$/i, 'GitHub')} ↗
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

export function ImageView({ path }: { path?: string }) {
  const file = fileAt(path)
  const siblings = useMemo(() => {
    if (!file) return []
    const dir = getNode(file.path.slice(0, file.path.lastIndexOf('/')) || '/')
    return dir?.type === 'dir' ? dir.children.filter((c): c is FileNode => c.type === 'file' && c.kind === 'image') : [file]
  }, [file])
  const [i, setI] = useState(() => Math.max(0, siblings.findIndex((s) => s.path === file?.path)))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((v) => (v + 1) % siblings.length)
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + siblings.length) % siblings.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [siblings.length])
  const current = siblings[i]
  if (!current) return <Missing />
  return (
    <div className="imgview">
      <img src={current.src} alt={current.name} />
      {siblings.length > 1 && (
        <div className="imgview-bar">
          <button type="button" onClick={() => setI((i - 1 + siblings.length) % siblings.length)} aria-label="Previous image">←</button>
          <span>{current.name} · {i + 1}/{siblings.length}</span>
          <button type="button" onClick={() => setI((i + 1) % siblings.length)} aria-label="Next image">→</button>
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
