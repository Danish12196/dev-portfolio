import { displayPath, findReadme, projectAt } from '../fs'
import type { FsNode } from '../fs/types'
import type { OpenSpec, Win } from '../store/windows'
import FolderView from './FolderView'
import Terminal from './Terminal'
import { AppFrame, ImageView, MarkdownView, PdfView, TextView, VideoView } from './Viewers'

/** What kind of window a file or folder opens in. */
export function specFor(node: FsNode): OpenSpec {
  if (node.type === 'dir') {
    return { kind: 'folder', path: node.path, title: node.meta?.name ?? displayPath(node.path), color: node.meta?.color }
  }
  const color = projectColor(node.path)
  if (node.kind === 'app') {
    const title = node.title ?? node.name.replace(/\.app$/, '')
    // Games carry their own size; the window adds its 42px title bar on top.
    if (node.width && node.height) return { kind: 'app', url: node.url, path: node.path, color, title: `${title} (play)`, w: node.width, h: node.height + 44 }
    return { kind: 'app', url: node.url, path: node.path, color, title: `${title} (live)` }
  }
  if (node.kind === 'link') return { kind: 'text', path: node.path, title: node.name, color }
  return { kind: node.kind, path: node.path, title: node.name, color }
}

export { findReadme }

/** The colour of the project a file lives in, if any. */
export function projectColor(path: string): string | undefined {
  return projectAt(path)?.meta?.color
}

interface RenderOpts {
  onExit: () => void
  onNavigate: (path: string) => void
  phone?: boolean
}

export function WindowContent({ win, opts }: { win: Pick<Win, 'kind' | 'path' | 'url' | 'title'>; opts: RenderOpts }) {
  switch (win.kind) {
    case 'terminal':
      return <Terminal onExit={opts.onExit} showShortcuts={opts.phone} />
    case 'folder':
      return <FolderView path={win.path ?? '/'} onNavigate={opts.onNavigate} singleClick={opts.phone} />
    case 'markdown':
      return <MarkdownView path={win.path} />
    case 'image':
      return <ImageView path={win.path} />
    case 'video':
      return <VideoView path={win.path} />
    case 'pdf':
      return <PdfView path={win.path} />
    case 'app':
      return <AppFrame url={win.url} title={win.title} />
    default:
      return <TextView path={win.path} />
  }
}
