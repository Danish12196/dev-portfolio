import type { FsNode } from '../fs/types'

/** Small flat file-type icons drawn inline so they follow the theme tokens. */
export default function Icon({ node, size = 44 }: { node: FsNode | 'terminal' | 'about'; size?: number }) {
  const s = { width: size, height: size }
  if (node === 'terminal')
    return (
      <svg viewBox="0 0 48 48" style={s} aria-hidden="true">
        <rect x="4" y="8" width="40" height="32" rx="3" fill="var(--term-bg)" stroke="var(--line-strong)" />
        <path d="M12 19l6 5-6 5" fill="none" stroke="var(--term-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 30h10" stroke="var(--term-accent)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  if (node === 'about' || (node.type === 'file' && node.name === 'about.md'))
    return (
      <svg viewBox="0 0 48 48" style={s} aria-hidden="true">
        <rect x="6" y="6" width="36" height="36" rx="3" fill="var(--paper)" stroke="var(--line-strong)" />
        <circle cx="24" cy="20" r="6" fill="var(--ink)" />
        <path d="M13 37c2-6 6-9 11-9s9 3 11 9" fill="var(--ink)" />
      </svg>
    )
  if (node.type === 'dir') {
    const c = node.meta?.color ?? 'var(--folder)'
    return (
      <svg viewBox="0 0 48 48" style={s} aria-hidden="true">
        <path d="M4 12a2 2 0 0 1 2-2h12l4 4h20a2 2 0 0 1 2 2v22a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill={c} />
        <path d="M4 18h40v20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill={c} style={{ filter: 'brightness(1.15)' }} />
        {node.meta && (
          <text x="24" y="34" textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700" fill="#fff">
            {node.meta.name.slice(0, 2).toUpperCase()}
          </text>
        )}
      </svg>
    )
  }
  const label: Record<string, string> = { markdown: 'MD', text: 'TXT', image: 'IMG', video: 'MP4', pdf: 'PDF', link: '↗', app: '▶' }
  const isApp = node.kind === 'app'
  return (
    <svg viewBox="0 0 48 48" style={s} aria-hidden="true">
      {isApp ? (
        <rect x="6" y="6" width="36" height="36" rx="9" fill="var(--accent)" />
      ) : (
        <path d="M10 4h20l10 10v30H10z" fill="var(--paper)" stroke="var(--line-strong)" />
      )}
      {!isApp && <path d="M30 4v10h10" fill="none" stroke="var(--line-strong)" />}
      <text x="24" y={isApp ? 30 : 34} textAnchor="middle" fontSize={isApp ? 16 : 10} fontFamily="var(--font-mono)" fontWeight="700" fill={isApp ? 'var(--on-accent)' : 'var(--ink)'}>
        {label[node.kind]}
      </text>
    </svg>
  )
}
