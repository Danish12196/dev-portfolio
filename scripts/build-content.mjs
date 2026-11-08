// Turns the folders in content/ into one file tree (src/generated/fs.json)
// that both the terminal and the desktop read. Binary assets (images, video,
// PDFs) are copied to public/fs/ and referenced by URL; text files are inlined.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, posix } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const CONTENT = join(ROOT, 'content')
const OUT_JSON = join(ROOT, 'src/generated/fs.json')
const OUT_ASSETS = join(ROOT, 'public/fs')

const KINDS = {
  '.md': 'markdown',
  '.txt': 'text',
  '.json': 'text',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.svg': 'image',
  '.mp4': 'video',
  '.webm': 'video',
  '.pdf': 'pdf',
  '.link': 'link',
  '.app': 'app',
}
const INLINE = new Set(['markdown', 'text'])
const COPY = new Set(['image', 'video', 'pdf'])

rmSync(OUT_ASSETS, { recursive: true, force: true })

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    throw new Error(`Could not parse ${file}: ${err.message}`)
  }
}

function walk(dir, path) {
  const entries = readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .sort((a, b) => a.localeCompare(b))
  const children = []
  let meta

  for (const name of entries) {
    const full = join(dir, name)
    const childPath = posix.join(path, name)
    if (statSync(full).isDirectory()) {
      children.push(walk(full, childPath))
      continue
    }
    if (name === 'project.json') meta = readJson(full)
    const kind = KINDS[extname(name).toLowerCase()] ?? 'text'
    const node = { type: 'file', name, path: childPath, kind }
    if (INLINE.has(kind)) node.text = readFileSync(full, 'utf8')
    if (kind === 'link') node.url = readFileSync(full, 'utf8').trim()
    if (kind === 'app') {
      const app = readJson(full)
      node.url = app.url
      node.title = app.title
    }
    if (COPY.has(kind)) {
      const dest = join(OUT_ASSETS, childPath)
      mkdirSync(join(dest, '..'), { recursive: true })
      cpSync(full, dest)
      node.src = `/fs${childPath}`
    }
    children.push(node)
  }

  // Folders first, then files, so listings read like a real file browser.
  children.sort((a, b) => (a.type === b.type ? 0 : a.type === 'dir' ? -1 : 1))
  const name = path === '/' ? '/' : posix.basename(path)
  return meta ? { type: 'dir', name, path, children, meta } : { type: 'dir', name, path, children }
}

const tree = walk(CONTENT, '/')
mkdirSync(join(OUT_JSON, '..'), { recursive: true })
writeFileSync(OUT_JSON, JSON.stringify(tree, null, 2))

const projects = tree.children.find((c) => c.name === 'projects')?.children.filter((c) => c.type === 'dir') ?? []
console.log(`content: ${projects.length} projects -> src/generated/fs.json`)
