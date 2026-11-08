import { marked } from 'marked'
import { useEffect, useMemo, useState } from 'react'
import { getNode } from '../fs'
import type { FileNode } from '../fs/types'

marked.use({ gfm: true })

function fileAt(path?: string): FileNode | undefined {
  const n = path ? getNode(path) : undefined
  return n?.type === 'file' ? n : undefined
}

export function MarkdownView({ path }: { path?: string }) {
  const file = fileAt(path)
  // Content comes from this repo's own content/ folder, so it is trusted HTML.
  const html = useMemo(() => (file?.text ? (marked.parse(file.text) as string) : ''), [file])
  if (!file) return <Missing />
  return (
    <article className="doc" dangerouslySetInnerHTML={{ __html: html }} onClick={(e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (a && a.host !== location.host) {
        e.preventDefault()
        window.open(a.href, '_blank', 'noopener,noreferrer')
      }
    }} />
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
  return <video className="media" src={file.src} controls playsInline />
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
