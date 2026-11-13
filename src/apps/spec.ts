import { displayPath, findReadme, projectAt, TRASH_DIR } from '../fs'
import type { FsNode } from '../fs/types'
import { CV_PATH } from '../shell/contact'
import type { OpenSpec } from '../store/windows'

/** What kind of window a file or folder opens in. */
export function specFor(node: FsNode): OpenSpec {
  if (node.type === 'dir') {
    const title = node.meta?.name ?? (node.path === TRASH_DIR ? 'Trash' : displayPath(node.path))
    return { kind: 'folder', path: node.path, title, color: node.meta?.color }
  }
  if (node.path === CV_PATH) return { kind: 'cv', path: node.path, title: 'CV & contact' }
  const color = projectColor(node.path)
  if (node.kind === 'app') {
    const title = node.title ?? node.name.replace(/\.app$/, '')
    // Games carry their own size; the window adds its 42px title bar on top.
    if (node.width && node.height) return { kind: 'app', url: node.url, path: node.path, color, title: `${title} (play)`, w: node.width, h: node.height + 44 }
    return { kind: 'app', url: node.url, path: node.path, color, title: `${title} (live)` }
  }
  if (node.kind === 'link') return { kind: 'text', path: node.path, title: node.name, color }
  // "README.md" alone is ambiguous in the taskbar once a few projects are open.
  const project = projectAt(node.path)
  const readme = /^readme\.md$/i.test(node.name) && project && project.path === node.path.slice(0, node.path.lastIndexOf('/'))
  return { kind: node.kind, path: node.path, title: readme ? `${project.meta?.name} · README` : node.name, color }
}

export { findReadme }

/** The colour of the project a file lives in, if any. */
export function projectColor(path: string): string | undefined {
  return projectAt(path)?.meta?.color
}
