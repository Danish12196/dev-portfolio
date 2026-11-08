import tree from '../generated/fs.json'
import type { DirNode, FsNode } from './types'

export const root = tree as unknown as DirNode
export const HOME = '/'
export const PROJECTS_DIR = '/projects'

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

/** Find a project by folder name or display name, e.g. "fuloos" or "Fuloos". */
export function findProject(name: string): DirNode | undefined {
  const q = name.toLowerCase()
  return projects().find((p) => p.name.toLowerCase() === q || p.meta?.name.toLowerCase() === q)
}

export function findApp(dir: DirNode) {
  return dir.children.find((c) => c.type === 'file' && c.kind === 'app')
}

export function findReadme(dir: DirNode) {
  return dir.children.find((c) => c.type === 'file' && c.name.toLowerCase() === 'readme.md')
}
