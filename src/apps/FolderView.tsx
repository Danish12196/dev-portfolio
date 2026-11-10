import { useEffect, useRef } from 'react'
import { getNode } from '../fs'
import type { FsNode } from '../fs/types'
import { openNode } from '../shell/opener'
import Icon from './Icon'

interface Props {
  path: string
  /** Navigate inside the same window instead of opening a new one. */
  onNavigate: (path: string) => void
  /** Phones open on a single tap. */
  singleClick?: boolean
}

export default function FolderView({ path, onNavigate, singleClick = false }: Props) {
  const gridRef = useRef<HTMLUListElement>(null)
  const shown = useRef(path)
  // Moving to another folder replaces the button that had focus, so put focus on the new listing.
  useEffect(() => {
    if (shown.current === path) return
    shown.current = path
    const host = gridRef.current?.closest('.win, .ph-app')
    if (host?.contains(document.activeElement) || document.activeElement === document.body) {
      gridRef.current?.querySelector<HTMLElement>('.file')?.focus({ preventScroll: true })
    }
  }, [path])
  const node = getNode(path)
  if (!node || node.type !== 'dir') return <p className="missing">This folder no longer exists.</p>
  const parent = path === '/' ? null : path.slice(0, path.lastIndexOf('/')) || '/'
  const parts = path.split('/').filter(Boolean)
  const meta = node.meta

  const activate = (child: FsNode) => (child.type === 'dir' ? onNavigate(child.path) : openNode(child))

  return (
    <div className="folder">
      <nav className="folder-bar" aria-label="Folder path">
        <button type="button" className="round-btn" disabled={!parent} onClick={() => parent && onNavigate(parent)} aria-label="Back">
          ‹
        </button>
        <button type="button" className={`crumb${parts.length === 0 ? ' here' : ''}`} onClick={() => onNavigate('/')}>
          home
        </button>
        {parts.map((part, i) => {
          const p = '/' + parts.slice(0, i + 1).join('/')
          const here = i === parts.length - 1
          const n = getNode(p)
          const color = n?.type === 'dir' ? n.meta?.color : undefined
          return (
            <span key={p} className="crumb-wrap">
              <span className="crumb-sep" aria-hidden="true">
                ›
              </span>
              <button type="button" className={`crumb${here ? ' here' : ''}`} style={{ ['--ic-color' as string]: color }} onClick={() => onNavigate(p)} aria-current={here ? 'page' : undefined}>
                {part}
              </button>
            </span>
          )
        })}
      </nav>
      {meta?.tagline && (
        <p className="folder-meta">
          <strong>{meta.name}</strong> {meta.tagline}
        </p>
      )}
      <ul className="folder-grid" ref={gridRef} aria-label={`Files in ${parts[parts.length - 1] ?? 'home'}`}>
        {node.children.map((c) => (
          <li key={c.path}>
            <button
              type="button"
              className="file"
              onDoubleClick={() => activate(c)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  activate(c)
                }
              }}
              onClick={(e) => {
                // Touch screens have no double-click, so a tap opens.
                if (singleClick || (e.nativeEvent as PointerEvent).pointerType === 'touch') activate(c)
              }}
            >
              <Icon node={c} color={meta?.color} />
              <span className="file-name">{c.type === 'dir' ? (c.meta?.name ?? c.name) : c.kind === 'app' ? `${c.title ?? c.name} app` : c.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
