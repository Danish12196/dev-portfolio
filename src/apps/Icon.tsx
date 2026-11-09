import type { CSSProperties } from 'react'
import type { FsNode } from '../fs/types'

type IconNode = FsNode | 'terminal' | 'about' | 'stats'

/** Rounded, outlined Soft Paper icons, drawn with CSS so they follow the theme. */
export default function Icon({ node, size = 'md', color }: { node: IconNode; size?: 'sm' | 'md' | 'lg' | 'xl'; color?: string }) {
  const cls = `ic ic-${size}`
  if (node === 'terminal')
    return (
      <span className={`${cls} ic-term`} aria-hidden="true">
        &gt;_
      </span>
    )
  if (node === 'stats')
    return (
      <span className={`${cls} ic-tile ic-stats`} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
    )
  if (node === 'about' || (node.type === 'file' && node.name === 'about.md'))
    return (
      <span className={`${cls} ic-tile ic-about`} aria-hidden="true">
        da
      </span>
    )
  if (node.type === 'dir') {
    const style = { ['--ic-color' as string]: node.meta?.color ?? color ?? 'var(--chip)' } as CSSProperties
    return (
      <span className={`${cls} ic-folder`} style={style} aria-hidden="true">
        <span className="ic-folder-tab" />
        <span className="ic-folder-body" />
      </span>
    )
  }
  if (node.kind === 'app') {
    const label = (node.title ?? node.name).slice(0, 1).toUpperCase()
    return (
      <span className={`${cls} ic-tile ic-app`} style={{ ['--ic-color' as string]: color ?? 'var(--mint)' } as CSSProperties} aria-hidden="true">
        {label}
      </span>
    )
  }
  if (node.kind === 'link')
    return (
      <span className={`${cls} ic-tile ic-link`} aria-hidden="true">
        ↗
      </span>
    )
  if (node.kind === 'video')
    return (
      <span className={`${cls} ic-tile ic-video`} aria-hidden="true">
        ▶
      </span>
    )
  const label: Record<string, string> = { markdown: 'MD', text: 'TXT', image: 'IMG', pdf: 'PDF' }
  return (
    <span className={`${cls} ic-doc${node.kind === 'markdown' || node.kind === 'pdf' ? ' ic-doc-accent' : ''}`} aria-hidden="true">
      {label[node.kind] ?? 'TXT'}
    </span>
  )
}
