import { displayPath, findApp, findProject, getNode, projects, resolvePath, root } from '../fs'
import type { DirNode, FsNode } from '../fs/types'
import { formatUpdated, NOW_PATH, readNow } from '../apps/now'
import { openNode } from '../shell/opener'
import { setTheme } from '../shell/theme'
import { EGG_COMMANDS, HIDDEN_FILES } from './eggs'
import { findEgg } from './found'
import { cmd, err, txt, type Line, type Seg } from './lines'

export type { Line, Seg } from './lines'

export interface Ctx {
  cwd: string
  setCwd: (p: string) => void
  print: (...lines: Line[]) => void
  clear: () => void
  exit: () => void
}

export interface Command {
  desc: string
  usage?: string
  /** Left out of help and tab completion. Finding it is the fun. */
  hidden?: boolean
  run: (args: string[], ctx: Ctx) => void
}


function nodeSeg(node: FsNode): Seg {
  if (node.type === 'dir') return { t: node.name + '/', cls: 'dir', open: node.path }
  return { t: node.name, open: node.path }
}

function textLines(text: string): Line[] {
  return text.replace(/<!--[\s\S]*?-->\n?/g, '').trimEnd().split('\n').map((l) => [txt(l)])
}

export const COMMANDS: Record<string, Command> = {
  help: {
    desc: 'list every command',
    run: (_a, { print }) => {
      print([txt('Commands', 'bold')])
      for (const [name, c] of Object.entries(COMMANDS)) {
        if (c.hidden) continue
        print([{ t: (c.usage ?? name).padEnd(22), cls: 'accent', run: name }, txt(c.desc, 'dim')])
      }
      print([txt('Tip: Tab completes names, ↑ recalls history, and anything underlined is clickable.', 'dim')])
      print([txt('A few commands are not on this list. ', 'dim'), cmd('eggs'), txt(' keeps score.', 'dim')])
    },
  },
  ls: {
    desc: 'list a folder',
    usage: 'ls [folder]',
    run: (argv, { cwd, print }) => {
      const all = argv.some((a) => /^-\w*a/.test(a))
      const args = argv.filter((a) => !a.startsWith('-'))
      const path = resolvePath(args[0] ?? '.', cwd)
      const node = getNode(path)
      if (!node) return print(err(`ls: ${args[0]}: no such file or folder`))
      if (node.type === 'file') return print([nodeSeg(node)])
      const segs: Seg[] = []
      if (all) {
        segs.push(txt('./', 'dir'), txt('  '), txt('../', 'dir'))
        for (const p of Object.keys(HIDDEN_FILES).filter((h) => resolvePath('..', h) === node.path)) {
          segs.push(txt('  '), { t: p.split('/').pop()!, cls: 'dim', run: `cat ${p}` })
        }
        if (node.children.length) segs.push(txt('  '))
      }
      node.children.forEach((c, i) => {
        if (i) segs.push(txt('  '))
        segs.push(nodeSeg(c))
      })
      print(segs.length ? segs : [txt('(empty)', 'dim')])
    },
  },
  cd: {
    desc: 'change folder',
    usage: 'cd <folder>',
    run: (args, { cwd, setCwd, print }) => {
      if (cwd === '/' && /^\/?\.\.(\/|$)/.test(args[0] ?? '')) {
        findEgg('escape')
        return print([txt("cd: you're already home. There is nothing above it. (I checked.)", 'dim')])
      }
      const path = resolvePath(args[0] ?? '~', cwd)
      const node = getNode(path)
      if (!node) return print(err(`cd: ${args[0]}: no such folder`))
      if (node.type !== 'dir') return print(err(`cd: ${args[0]}: not a folder`))
      setCwd(node.path)
    },
  },
  pwd: {
    desc: 'show the current folder',
    run: (_a, { cwd, print }) => print([txt(displayPath(cwd))]),
  },
  cat: {
    desc: 'print a text file',
    usage: 'cat <file>',
    run: (args, { cwd, print }) => {
      if (!args[0]) return print(err('cat: which file? Try `cat about.md`'))
      const path = resolvePath(args[0], cwd)
      if (HIDDEN_FILES[path]) {
        findEgg('dotfile')
        return print(...textLines(HIDDEN_FILES[path]))
      }
      // `cat about.txt` and friends find the .md version.
      const node = getNode(path) ?? getNode(path.replace(/\.txt$/i, '.md'))
      if (!node) return print(err(`cat: ${args[0]}: no such file`))
      if (node.type === 'dir') return print(err(`cat: ${args[0]}: is a folder (try \`ls ${args[0]}\`)`))
      if (node.text != null) return print(...textLines(node.text))
      if (node.url) return print([txt('→ '), { t: node.url, href: node.url }])
      print([txt(`${node.name} is a ${node.kind} file. `, 'dim'), { t: `open ${node.name}`, open: node.path }])
    },
  },
  open: {
    desc: 'open a project, folder or file in a window',
    usage: 'open <name>',
    run: (args, { cwd, print }) => {
      if (!args[0]) return print(err('open: what should I open? Try `open fuloos`'))
      const node = getNode(resolvePath(args[0], cwd)) ?? findProject(args[0])
      if (!node) return print(err(`open: ${args[0]}: not found. Try \`projects\` to see what's here.`))
      openNode(node)
      print([txt('opening ', 'dim'), nodeSeg(node)])
    },
  },
  run: {
    desc: "launch a project's live app (games open on itch.io)",
    usage: 'run <project>',
    run: (args, { print }) => {
      const dir = args[0] ? findProject(args[0]) : undefined
      const app = dir && findApp(dir)
      if (!dir) return print(err(`run: ${args[0] ?? '?'}: no such project. Try \`projects\`.`))
      // Games live on itch.io, which can't be embedded, so `run` opens their page there instead.
      const itch = !app ? dir.children.find((c) => c.type === 'file' && c.kind === 'link' && /^itch\.link$/i.test(c.name)) : undefined
      if (itch) {
        openNode(itch)
        return print([txt('opening ', 'dim'), txt(dir.meta?.name ?? dir.name, 'accent'), txt(' on itch.io ↗', 'dim')])
      }
      if (!app) return print(err(`run: ${dir.meta?.name ?? dir.name} has no live app yet.`))
      openNode(app)
      print([txt('launching ', 'dim'), txt(app.name, 'accent')])
    },
  },
  play: {
    desc: 'play Jeopardy',
    usage: 'play jeopardy',
    run: (args, ctx) => COMMANDS.run.run([args[0] ?? 'jeopardy'], ctx),
  },
  projects: {
    desc: 'table of every project',
    run: (_a, { print }) => {
      const list = projects()
      print([txt('NAME'.padEnd(16) + 'YEAR'.padEnd(7) + 'STATUS'.padEnd(10) + 'ABOUT', 'dim')])
      for (const p of list) {
        const m = p.meta
        print([
          { t: (m?.name ?? p.name).padEnd(16), cls: 'dir', open: p.path },
          txt(String(m?.year ?? '').padEnd(7)),
          txt((m?.status ?? '').padEnd(10), 'dim'),
          txt(m?.tagline ?? ''),
        ])
      }
    },
  },
  now: {
    desc: "what I'm working on right now",
    run: (_a, { print }) => {
      const now = readNow()
      if (!now) return print(err('now: nothing on the go. Suspicious.'))
      const when = formatUpdated(now.updated)
      print([txt('Now', 'bold'), txt(when ? ` · updated ${when}` : '', 'dim')])
      for (const item of now.items) print([txt('  • ', 'accent'), txt(item)])
      print([txt('Full note: ', 'dim'), { t: 'now.md', open: NOW_PATH }])
    },
  },
  whoami: {
    desc: 'who made this',
    run: (_a, { print }) => {
      const about = getNode('/about.md')
      if (about?.type === 'file' && about.text) print(...textLines(about.text))
    },
  },
  theme: {
    desc: 'switch light or dark',
    usage: 'theme light|dark',
    run: (args, { print }) => {
      if (args[0] !== 'light' && args[0] !== 'dark') return print(err('theme: use `theme light` or `theme dark`'))
      setTheme(args[0])
      print([txt(`theme set to ${args[0]}`, 'dim')])
    },
  },
  echo: {
    desc: 'print some text',
    usage: 'echo <text>',
    run: (args, { print }) => print([txt(args.join(' '))]),
  },
  date: {
    desc: 'show the date and time',
    run: (_a, { print }) => print([txt(new Date().toString())]),
  },
  clear: {
    desc: 'clear the screen',
    run: (_a, { clear }) => clear(),
  },
  exit: {
    desc: 'close the terminal and show the desktop',
    run: (_a, { exit }) => exit(),
  },
  ...EGG_COMMANDS,
}

const visible = () => Object.keys(COMMANDS).filter((c) => !COMMANDS[c].hidden)

function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

export function execute(input: string, ctx: Ctx) {
  const [name, ...args] = input.trim().split(/\s+/)
  if (!name) return
  const cmd = COMMANDS[name.toLowerCase()]
  if (cmd) return cmd.run(args, ctx)
  // Typing a project name on its own opens it.
  const project = findProject(name)
  if (project) return COMMANDS.open.run([project.name], ctx)
  const best = visible().sort((a, b) => distance(name, a) - distance(name, b))[0]
  ctx.print([
    txt(`${name}: command not found.`, 'err'),
    ...(distance(name, best) <= 2 ? [txt(' Did you mean ', 'dim'), { t: best, cls: 'accent' as const, run: best }, txt('?', 'dim')] : []),
    txt(' Type ', 'dim'),
    { t: 'help', cls: 'accent', run: 'help' },
    txt('.', 'dim'),
  ])
}

/** Tab completion for the last word: commands first, then paths. */
export function complete(input: string, cwd: string): string {
  const parts = input.split(' ')
  const last = parts[parts.length - 1]
  if (parts.length === 1) {
    const hits = visible().filter((c) => c.startsWith(last.toLowerCase()))
    return hits.length === 1 ? hits[0] + ' ' : input
  }
  const slash = last.lastIndexOf('/')
  const base = slash >= 0 ? last.slice(0, slash + 1) : ''
  const stem = last.slice(slash + 1).toLowerCase()
  const dir = getNode(resolvePath(base || '.', cwd))
  if (!dir || dir.type !== 'dir') return input
  const hits = (dir as DirNode).children.filter((c) => c.name.toLowerCase().startsWith(stem))
  if (hits.length !== 1) return input
  const hit = hits[0]
  parts[parts.length - 1] = base + hit.name + (hit.type === 'dir' ? '/' : ' ')
  return parts.join(' ')
}

export const WELCOME: Line[] = [
  [txt('Dev portfolio', 'bold'), txt(` · ${projects().length} projects in `, 'dim'), { t: '~/projects', cls: 'dir', open: '/projects' }],
  [txt('Type ', 'dim'), cmd('help'), txt(' to look around, ', 'dim'), cmd('projects'), txt(' for the list, or ', 'dim'), cmd('exit'), txt(' for the desktop.', 'dim')],
]

export { root }
