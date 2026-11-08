import { displayPath, getNode } from '../fs'
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
  const node = getNode(path)
  if (!node || node.type !== 'dir') return <p className="missing">This folder no longer exists.</p>
  const parent = path === '/' ? null : path.slice(0, path.lastIndexOf('/')) || '/'
  const meta = node.meta

  const activate = (child: FsNode) => (child.type === 'dir' ? onNavigate(child.path) : openNode(child))

  return (
    <div className="folder">
      <div className="folder-bar">
        <button type="button" disabled={!parent} onClick={() => parent && onNavigate(parent)} aria-label="Up one folder">
          ↑
        </button>
        <span className="folder-path">{displayPath(path)}</span>
        <span className="folder-count">{node.children.length} items</span>
      </div>
      {meta && (
        <div className="folder-meta">
          <strong>{meta.name}</strong>
          {meta.tagline && <span>{meta.tagline}</span>}
          <span className="folder-tags">
            {[meta.year, meta.status, ...(meta.stack ?? [])].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}
      <ul className="folder-grid">
        {node.children.map((c) => (
          <li key={c.path}>
            <button type="button" className="file" onDoubleClick={() => activate(c)} onKeyDown={(e) => e.key === 'Enter' && activate(c)} onClick={(e) => {
              // Touch screens have no double-click, so a tap opens.
              if (singleClick || (e.nativeEvent as PointerEvent).pointerType === 'touch') activate(c)
            }}>
              <Icon node={c} />
              <span className="file-name">{c.type === 'dir' ? c.meta?.name ?? c.name : c.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
