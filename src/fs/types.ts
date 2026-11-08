export type FileKind = 'markdown' | 'text' | 'image' | 'video' | 'pdf' | 'link' | 'app'

export interface ProjectMeta {
  name: string
  tagline?: string
  year?: number
  stack?: string[]
  status?: string
  color?: string
  order?: number
}

export interface FileNode {
  type: 'file'
  name: string
  path: string
  kind: FileKind
  text?: string
  src?: string
  url?: string
  title?: string
}

export interface DirNode {
  type: 'dir'
  name: string
  path: string
  children: FsNode[]
  meta?: ProjectMeta
}

export type FsNode = FileNode | DirNode
