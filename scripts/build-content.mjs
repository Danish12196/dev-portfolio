// Turns the folders in content/ into one file tree (src/generated/fs.json)
// that both the terminal and the desktop read. Binary assets (images, video,
// PDFs) are copied to public/fs/ and referenced by URL; text files are inlined.
//
// A project.json with "repo": "owner/name" also gets a media/ folder listing the
// screenshots and videos in that repo's portfolio/ folder (or the folder named
// by "media"). They load straight from GitHub, so pushing a new screenshot to a
// project's repo and redeploying this site is enough to show it.
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

/** demo-poster.jpg next to demo.mp4 becomes the video's poster instead of its own file. */
function attachPosters(children) {
  for (const video of children.filter((c) => c.kind === 'video')) {
    const base = video.name.replace(/\.[^.]+$/, '')
    const i = children.findIndex((c) => c.kind === 'image' && new RegExp(`^${base}-poster\\.\\w+$`, 'i').test(c.name))
    if (i === -1) continue
    video.poster = children[i].src
    children.splice(i, 1)
  }
}

const MEDIA_KINDS = new Set(['image', 'video'])
const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'dev-portfolio-build',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
}

/** Files in one folder of a public GitHub repo, from the GitHub API or, if that fails, jsDelivr. */
async function listRepoFolder(repo, folder) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${folder}`, { headers: GITHUB_HEADERS })
    if (res.status === 404) return []
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const items = await res.json()
    return items.filter((i) => i.type === 'file').map((i) => ({ name: i.name, url: i.download_url }))
  } catch (err) {
    const res = await fetch(`https://data.jsdelivr.com/v1/packages/gh/${repo}@HEAD?structure=flat`)
    if (!res.ok) throw new Error(`${err.message}; jsDelivr ${res.status}`)
    const { files } = await res.json()
    const prefix = `/${folder}/`
    return files
      .filter((f) => f.name.startsWith(prefix) && !f.name.slice(prefix.length).includes('/'))
      .map((f) => ({ name: f.name.slice(prefix.length), url: `https://cdn.jsdelivr.net/gh/${repo}@HEAD${f.name}` }))
  }
}

/** The media/ folder for a project whose screenshots and videos live in its own repo. */
async function repoMedia(meta, path) {
  const folder = (meta.media ?? 'portfolio').replace(/^\/+|\/+$/g, '')
  let files
  try {
    files = await listRepoFolder(meta.repo, folder)
  } catch (err) {
    console.warn(`content: skipped media for ${meta.repo} (${err.message})`)
    return undefined
  }
  const dirPath = posix.join(path, 'media')
  const nodes = files
    .map((f) => ({ ...f, kind: KINDS[extname(f.name).toLowerCase()] }))
    .filter((f) => MEDIA_KINDS.has(f.kind) && !/-poster\.(jpe?g|png|webp)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => {
      const node = { type: 'file', name: f.name, path: posix.join(dirPath, f.name), kind: f.kind, src: f.url }
      if (f.kind === 'video') {
        const base = f.name.replace(/\.[^.]+$/, '')
        const poster = files.find((p) => new RegExp(`^${base}-poster\\.(jpe?g|png|webp)$`, 'i').test(p.name))
        if (poster) node.poster = poster.url
      }
      return node
    })
  // Videos first, then screenshots in name order (01-..., 02-...).
  nodes.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'video' ? -1 : 1))
  return nodes.length ? { type: 'dir', name: 'media', path: dirPath, children: nodes } : undefined
}

async function walk(dir, path) {
  const entries = readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .sort((a, b) => a.localeCompare(b))
  const children = []
  let meta

  for (const name of entries) {
    const full = join(dir, name)
    const childPath = posix.join(path, name)
    if (statSync(full).isDirectory()) {
      children.push(await walk(full, childPath))
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
      // Games ask for their window to open at the size they were built for.
      if (app.width && app.height) Object.assign(node, { width: app.width, height: app.height })
    }
    if (COPY.has(kind)) {
      const dest = join(OUT_ASSETS, childPath)
      mkdirSync(join(dest, '..'), { recursive: true })
      cpSync(full, dest)
      node.src = `/fs${childPath}`
    }
    children.push(node)
  }

  attachPosters(children)

  // "cover": "media/01-cover.jpg" in project.json shows that image on the project's README.
  if (meta?.cover) {
    const cover = meta.cover.split('/').reduce((dir, part) => dir?.children?.find((c) => c.name === part), { children })
    if (!cover?.src) throw new Error(`${join(dir, 'project.json')}: cover ${meta.cover} is not an image in that folder`)
    meta = { ...meta, cover: cover.src }
  }

  if (meta?.repo && !children.some((c) => c.name === 'media')) {
    const media = await repoMedia(meta, path)
    if (media) children.push(media)
  }

  // Folders first, then files, so listings read like a real file browser.
  children.sort((a, b) => (a.type === b.type ? 0 : a.type === 'dir' ? -1 : 1))
  const name = path === '/' ? '/' : posix.basename(path)
  return meta ? { type: 'dir', name, path, children, meta } : { type: 'dir', name, path, children }
}

const tree = await walk(CONTENT, '/')
mkdirSync(join(OUT_JSON, '..'), { recursive: true })
writeFileSync(OUT_JSON, JSON.stringify(tree, null, 2))

const count = (node) => (node.meta ? 1 : 0) + (node.children ?? []).reduce((n, c) => n + count(c), 0)
const media = (node) => (node.name === 'media' && node.type === 'dir' ? node.children.length : 0) + (node.children ?? []).reduce((n, c) => n + media(c), 0)
console.log(`content: ${count(tree)} project folders, ${media(tree)} media files -> src/generated/fs.json`)
