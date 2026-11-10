import tree from '../generated/fs.json'
import type { DirNode, FsNode } from './types'

export const root = tree as unknown as DirNode
export const HOME = '/'
export const PROJECTS_DIR = '/projects'
/** Abandoned projects, shown as the desktop's trash can rather than in the project lists. */
export const TRASH_DIR = '/trash'

/** Resolve a shell-style path (absolute, relative, ~, ., ..) against cwd. */
export function resolvePath(input: string, cwd: string): string {
  let p = input.trim()
  if (p === '' || p === '~') return HOME
  if (p.startsWith('~/')) p = p.slice(1)
  const parts = (p.startsWith('/') ? p : `${cwd}/${p}`).split('/')
  const out: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return '/' + out.join('/')
}

export function getNode(path: string): FsNode | undefined {
  if (path === '/' || path === '') return root
  let node: FsNode = root
  for (const part of path.split('/').filter(Boolean)) {
    if (node.type !== 'dir') return undefined
    const next: FsNode | undefined = node.children.find((c) => c.name.toLowerCase() === part.toLowerCase())
    if (!next) return undefined
    node = next
  }
  return node
}

/** Shows paths the way a shell prompt would: /projects/fuloos -> ~/projects/fuloos */
export function displayPath(path: string): string {
  return path === '/' ? '~' : `~${path}`
}

export function projects() {
  const dir = getNode(PROJECTS_DIR)
  if (!dir || dir.type !== 'dir') return []
  return dir.children
    .filter((c): c is DirNode => c.type === 'dir')
    .sort((a, b) => (a.meta?.order ?? 99) - (b.meta?.order ?? 99))
}

/** Every folder with a project.json, including ones nested inside others (university subjects). */
export function allProjects(dir: DirNode | undefined = getNode(PROJECTS_DIR) as DirNode | undefined): DirNode[] {
  if (!dir || dir.type !== 'dir') return []
  return dir.children
    .filter((c): c is DirNode => c.type === 'dir')
    .flatMap((c) => [...(c.meta ? [c] : []), ...allProjects(c)])
}

/** Find a project by folder name or display name, e.g. "fuloos", "Fuloos" or "ledger". */
export function findProject(name: string): DirNode | undefined {
  const q = name.toLowerCase()
  return allProjects().find(
    (p) => p.name.toLowerCase() === q || p.meta?.name.toLowerCase() === q || p.meta?.aliases?.some((a) => a.toLowerCase() === q),
  )
}

/** The innermost project folder that contains path, if any. */
export function projectAt(path: string): DirNode | undefined {
  const parts = path.split('/').filter(Boolean)
  for (let i = parts.length; i > 0; i--) {
    const n = getNode('/' + parts.slice(0, i).join('/'))
    if (n?.type === 'dir' && n.meta) return n
  }
  return undefined
}

export function findApp(dir: DirNode) {
  return dir.children.find((c) => c.type === 'file' && c.kind === 'app')
}

export function findReadme(dir: DirNode) {
  return dir.children.find((c) => c.type === 'file' && c.name.toLowerCase() === 'readme.md')
}
