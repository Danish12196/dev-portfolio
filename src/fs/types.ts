export type FileKind = 'markdown' | 'text' | 'image' | 'video' | 'pdf' | 'link' | 'app'

export interface ProjectMeta {
  name: string
  tagline?: string
  year?: number
  stack?: string[]
  status?: string
  color?: string
  order?: number
  /** owner/name of the GitHub repo whose screenshots and videos fill media/ */
  repo?: string
  /** folder in that repo holding them, default portfolio */
  media?: string
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
  /** still shown before a video plays */
  poster?: string
  /** images: the original file when src is a smaller copy */
  full?: string
  /** images: pixel size of src, so the viewer can reserve space */
  width?: number
  height?: number
}

export interface DirNode {
  type: 'dir'
  name: string
  path: string
  children: FsNode[]
  meta?: ProjectMeta
}

export type FsNode = FileNode | DirNode
