// Easter eggs: fun commands, mini games and hidden secrets.
// Commands marked hidden don't show in help or tab completion; finding them is the game.
import { findProject, getNode, projects } from '../fs'
import type { DirNode, FsNode } from '../fs/types'
import { cmd, err, txt, type Line, type Seg } from './lines'
import { later, useTerm, type Skin } from './store'
import { EGGS, findEgg, foundEggs, resetEggs } from './found'
import type { Command } from './commands'

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

/* ---------- neofetch ---------- */

const LOGO = [
  ' ____   ',
  '|  _ \\  ',
  '| | | | ',
  '| |_| | ',
  '|____/  ',
]

function browserName() {
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'a browser'
}

function uptime() {
  const s = Math.floor(performance.now() / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m} min${m === 1 ? '' : 's'}, ${s % 60} secs` : `${s} secs`
}

/* ---------- games from itch.io ---------- */

interface Game {
  name: string
  tagline: string
  url: string
  folder?: string
}

// Used until the games have their own folder in content/. Once /projects/games exists, `games` reads from there.
const ITCH = 'https://danish-gamedev.itch.io'
const FALLBACK_GAMES: Game[] = [
  { name: 'Rolling in Dough', tagline: 'Tower defense: cats guard their biscuits from dogs. Brackeys Jam 2025.2, I was on the code team.', url: 'https://mckay-makes-games.itch.io/rolling-in-dough' },
  { name: 'The Feed', tagline: 'Drag and drop news articles to control the feed. Pakistani Game Jam.', url: `${ITCH}/the-feed` },
  { name: 'Game Dev Loop', tagline: 'My first game jam, about jumping genres as deadlines hit. GMTK Jam.', url: `${ITCH}/game-dev-loop` },
]

function gamesFromFs(): Game[] {
  const dir = getNode('/projects/games') ?? findProject('games')
  if (!dir || dir.type !== 'dir') return []
  return dir.children
    .filter((c): c is DirNode => c.type === 'dir' && !!c.meta)
    .sort((a, b) => (a.meta?.order ?? 99) - (b.meta?.order ?? 99))
    .map((g) => {
      const link = g.children.find((c): c is Extract<FsNode, { type: 'file' }> => c.type === 'file' && (c.kind === 'app' || c.kind === 'link') && !!c.url && /itch\.io/.test(c.url))
      return { name: g.meta!.name, tagline: g.meta!.tagline ?? '', url: link?.url ?? ITCH, folder: g.path }
    })
}

/* ---------- fortune and cowsay ---------- */

const FORTUNES = [
  'It works on my machine. Ship the machine.',
  'The best code is the code you deleted.',
  'Every side project starts by buying a domain.',
  'You will fix one bug and find three more. This is called progress.',
  "Today's forecast: 90% chance of npm install.",
  'Weekend plan: one small refactor. Weekend result: rewrote everything.',
  'The game jam deadline is closer than it appears.',
  'Your future holds a CSS bug that only happens on Safari.',
  'The rubber duck asks: have you tried reading the error message?',
  "Somewhere a semicolon is missing. For once, it isn't yours.",
  'Cats guard biscuits. Developers guard main.',
  "A budget is just a for loop you're not allowed to break out of.",
  'Naming things is hard. That is why this file is called eggs.ts.',
  'Commit early, commit often, write better messages than "fix".',
]

function cowsay(text: string): Line[] {
  const words = text.split(/\s+/).filter(Boolean)
  const rows: string[] = []
  let row = ''
  for (const w of words) {
    if (row && (row + ' ' + w).length > 36) {
      rows.push(row)
      row = w
    } else row = row ? `${row} ${w}` : w
  }
  if (row) rows.push(row)
  const width = Math.max(...rows.map((r) => r.length))
  const pad = (r: string) => r.padEnd(width)
  const bubble =
    rows.length === 1
      ? [`< ${pad(rows[0])} >`]
      : rows.map((r, i) => (i === 0 ? `/ ${pad(r)} \\` : i === rows.length - 1 ? `\\ ${pad(r)} /` : `| ${pad(r)} |`))
  return [
    ' ' + '_'.repeat(width + 2),
    ...bubble,
    ' ' + '-'.repeat(width + 2),
    '        \\   ^__^',
    '         \\  (oo)\\_______',
    '            (__)\\       )\\/\\',
    '                ||----w |',
    '                ||     ||',
  ].map((l) => [txt(l)])
}

/* ---------- hidden files ---------- */

export const HIDDEN_FILES: Record<string, string> = {
  '/.secret': [
    'You found the secret file.',
    '',
    'Most visitors just click the folders. You typed ls -a,',
    'which means you are my kind of person.',
    '',
    'There are more secrets in this terminal. `eggs` keeps count.',
  ].join('\n'),
}

/* ---------- skins ---------- */

const SKINS: Skin[] = ['green', 'amber', 'ice', 'mono']

/* ---------- commands ---------- */

export const EGG_COMMANDS: Record<string, Command> = {
  neofetch: {
    desc: 'system info, the classic way',
    run: () => {
      const { skin } = useTerm.getState()
      const info: Line[] = [
        [txt('danish', 'accent'), txt('@'), txt('dev', 'accent')],
        [txt('----------', 'dim')],
        ...(
          [
            ['OS', 'PaperOS 1.0 (it runs in your browser)'],
            ['Host', 'danishali.dev'],
            ['Kernel', 'React 19 + Vite'],
            ['Uptime', uptime()],
            ['Packages', `${projects().length} projects`],
            ['Shell', 'dsh 0.1 (danish shell)'],
            ['Resolution', `${window.innerWidth}x${window.innerHeight}`],
            ['Theme', `Soft Paper (${document.documentElement.dataset.theme ?? 'light'})`],
            ['Terminal', `${skin} on black`],
            ['Browser', browserName()],
          ] as const
        ).map(([k, v]): Line => [txt(`${k}: `, 'accent'), txt(v)]),
        [],
        ['#0a0f0a', '#ff7a6b', '#3cff7a', '#f7d774', '#93a6f2', '#f49a8c', '#7dffa8', '#fffdf8'].map((c): Seg => ({ t: '███', color: c })),
      ]
      const rows = Math.max(LOGO.length, info.length)
      const out: Line[] = []
      for (let i = 0; i < rows; i++) out.push([txt((LOGO[i] ?? '').padEnd(12), 'accent'), ...(info[i] ?? [])])
      useTerm.getState().push(...out)
    },
  },
  games: {
    desc: 'games I made, on itch.io',
    run: (_a, { print }) => {
      const fromFs = gamesFromFs()
      const list = fromFs.length ? fromFs : FALLBACK_GAMES
      print([txt('Games', 'bold'), txt(' · made at game jams, all playable in the browser', 'dim')])
      for (const g of list) {
        print(
          [g.folder ? { t: g.name, cls: 'dir', open: g.folder } : txt(g.name, 'accent'), txt('  '), { t: 'play ↗', href: g.url }],
          [txt('  ' + g.tagline, 'dim')],
        )
      }
      print([txt('More at ', 'dim'), { t: 'danish-gamedev.itch.io', href: ITCH }, txt(' · or play one here: ', 'dim'), cmd('snake'), txt(', ', 'dim'), cmd('guess')])
    },
  },
  itch: { desc: 'same as games', hidden: true, run: (a, c) => EGG_COMMANDS.games.run(a, c) },
  fortune: {
    desc: 'a fortune cookie for developers',
    run: (_a, { print }) => print([txt(pick(FORTUNES))]),
  },
  cowsay: {
    desc: 'a cow says it for you',
    usage: 'cowsay <text>',
    run: (args, { print }) => print(...cowsay(args.join(' ') || pick(FORTUNES))),
  },
  snake: {
    desc: 'play snake (arrows or swipe, q quits)',
    run: () => useTerm.getState().launch('snake'),
  },
  guess: {
    desc: 'guess the number I am thinking of',
    run: (_a, { print }) => {
      const target = 1 + Math.floor(Math.random() * 100)
      let tries = 0
      print([txt("I'm thinking of a number from 1 to 100. Type ", 'dim'), txt('q', 'accent'), txt(' to give up.', 'dim')])
      useTerm.getState().capture({
        prompt: 'guess> ',
        onInput: (line) => {
          const { push, capture } = useTerm.getState()
          if (line === 'q' || line === 'quit') {
            capture(null)
            return push([txt(`It was ${target}. Next time!`, 'dim')])
          }
          const n = Number(line)
          if (!Number.isInteger(n) || n < 1 || n > 100) return push(err('A whole number from 1 to 100, please.'))
          tries++
          if (n < target) return push([txt('Higher.')])
          if (n > target) return push([txt('Lower.')])
          capture(null)
          push([txt(`Got it in ${tries} ${tries === 1 ? 'try' : 'tries'}! `, 'bold'), txt(tries <= 7 ? 'That is binary search, nice.' : 'Try halving the range each time.', 'dim')])
        },
      })
    },
  },
  matrix: {
    desc: 'follow the white rabbit (any key exits)',
    run: () => useTerm.getState().launch('matrix'),
  },
  skin: {
    desc: 'recolour this terminal',
    usage: 'skin <name>',
    run: (args, { print }) => {
      const names = foundEggs().has('konami') ? [...SKINS, 'rainbow' as Skin] : SKINS
      const want = args[0]?.toLowerCase() as Skin | undefined
      if (!want || !names.includes(want)) {
        const segs: Seg[] = [txt('skins: ', 'dim')]
        names.forEach((n, i) => segs.push(...(i ? [txt(' ')] : []), cmd(n, `skin ${n}`)))
        return print(segs, [txt('Green comes back when you reload.', 'dim')])
      }
      useTerm.getState().setSkin(want)
      print([txt(`skin set to ${want}`, 'dim')])
    },
  },
  history: {
    desc: 'commands you have typed',
    run: (_a, { print }) => {
      const { history } = useTerm.getState()
      history.forEach((h, i) => print([txt(String(i + 1).padStart(4) + '  ', 'dim'), { t: h, run: h }]))
    },
  },
  eggs: {
    desc: 'how many secrets you have found',
    usage: 'eggs [reset]',
    run: (args, { print }) => {
      if (args[0] === 'reset') {
        resetEggs()
        return print([txt('Forgot every secret you found. Happy hunting.', 'dim')])
      }
      const found = foundEggs()
      const all = Object.keys(EGGS)
      print([txt(`Secrets found: ${found.size} of ${all.length}`, 'bold')])
      const bar = all.map((id) => (found.has(id) ? '★' : '·')).join(' ')
      print([txt(bar, 'accent')])
      const left = all.filter((id) => !found.has(id))
      if (left.length) print([txt('hint: ', 'dim'), txt(EGGS[pick(left)])])
      else print([txt('All found. You are officially a power user.', 'accent')])
    },
  },

  /* ----- hidden ----- */

  sudo: {
    desc: 'superpowers',
    hidden: true,
    run: (args, { print }) => {
      if (!args.length) return print(err('usage: sudo <command>'))
      if (args.join(' ').toLowerCase() === 'make me a sandwich') {
        findEgg('sudo')
        return print([txt('Okay.')])
      }
      useTerm.getState().capture({
        prompt: '[sudo] password for danish: ',
        secret: true,
        onInput: () => {
          const { push, capture } = useTerm.getState()
          capture(null)
          push(err('danish is not in the sudoers file. This incident will be reported.'), [txt('(reported to: nobody. you are fine.)', 'dim')])
          findEgg('sudo')
        },
      })
    },
  },
  rm: {
    desc: 'remove files',
    hidden: true,
    run: (args, { print }) => {
      const flags = args.filter((a) => a.startsWith('-')).join('')
      const targets = args.filter((a) => !a.startsWith('-'))
      const everything = /r/.test(flags) && targets.some((t) => ['/', '~', '*', '/*', '~/'].includes(t))
      if (!everything) return print(err("rm: this portfolio is read-only. Nice try though."))
      const paths: string[] = []
      const walk = (n: FsNode) => {
        if (n.type === 'dir') n.children.forEach(walk)
        if (n.path !== '/') paths.push(n.path)
      }
      walk(getNode('/')!)
      const shown = paths.slice(0, 24)
      shown.forEach((p, i) => later(60 * i, [txt(`removed '~${p}'`, 'dim')]))
      later(60 * shown.length + 200, [txt(`… and ${Math.max(0, paths.length - shown.length)} more`, 'dim')])
      later(60 * shown.length + 1200, [txt('Just kidding. Nothing was deleted, everything is still here.', 'accent')])
      setTimeout(() => findEgg('rm'), 60 * shown.length + 1300)
    },
  },
  vim: {
    desc: 'the editor',
    hidden: true,
    run: (args, { print }) => {
      let tries = 0
      print(
        [txt('~')],
        [txt('~               VIM - Vi IMproved', 'bold')],
        [txt('~')],
        [txt(`~   editing ${args[0] ?? '[No Name]'} (read-only)`, 'dim')],
        [txt('~')],
      )
      useTerm.getState().capture({
        prompt: '',
        trap: 'Type  :qa!  and press <Enter> to abandon all changes and exit Vim',
        onInput: (line) => {
          const { push, capture } = useTerm.getState()
          if ([':q', ':q!', ':qa', ':qa!', ':wq', ':x', 'ZZ'].includes(line.trim())) {
            capture(null)
            push([txt('You escaped vim. Put that on your CV.', 'accent')])
            return findEgg('vim')
          }
          tries++
          push(err(line.startsWith(':') ? `E492: Not an editor command: ${line.slice(1)}` : '-- INSERT --  (just kidding, the file is read-only)'))
          if (tries === 3) push([txt('psst: real vim users type ', 'dim'), txt(':q', 'accent')])
        },
      })
    },
  },
  vi: { desc: 'the editor', hidden: true, run: (a, c) => EGG_COMMANDS.vim.run(a, c) },
  nvim: { desc: 'the editor', hidden: true, run: (a, c) => EGG_COMMANDS.vim.run(a, c) },
  nano: {
    desc: 'the friendly editor',
    hidden: true,
    run: (_a, { print }) => print([txt('nano: good taste, but everything here is read-only.', 'dim')]),
  },
  emacs: {
    desc: 'the other editor',
    hidden: true,
    run: (_a, { print }) => print(err('emacs: not installed. There is a vim though, if you are brave.')),
  },
  ':q': {
    desc: 'quit',
    hidden: true,
    run: (_a, { print }) => print([txt("You're not in vim. Good reflexes though.", 'dim')]),
  },
  hack: {
    desc: 'hack the mainframe',
    hidden: true,
    run: () => {
      const steps = [
        'connecting to mainframe…',
        'bypassing firewall  [##########] 100%',
        'decrypting passwords… hunter2, password123, letmein',
        'downloading the internet… 2%… actually, never mind',
        'enhancing… enhancing…',
      ]
      steps.forEach((s, i) => later(450 * i, [txt('> ' + s, 'dim')]))
      later(450 * steps.length + 300, [txt('ACCESS GRANTED', 'bold')], [txt("…to Danish's projects, which were public anyway. Try ", 'dim'), cmd('projects'), txt('.', 'dim')])
      setTimeout(() => findEgg('hack'), 450 * steps.length + 400)
    },
  },
  coffee: {
    desc: 'brew coffee',
    hidden: true,
    run: (_a, { print }) => {
      print([txt('brewing coffee…', 'dim')])
      later(900, err("Error 418: I'm a teapot."), [txt('Try ', 'dim'), cmd('tea'), txt(' instead.', 'dim')])
      setTimeout(() => findEgg('coffee'), 950)
    },
  },
  brew: { desc: 'brew', hidden: true, run: (a, c) => (a[0] === 'coffee' ? EGG_COMMANDS.coffee.run(a, c) : c.print(err(`brew: no formula named ${a[0] ?? '?'} here`))) },
  tea: {
    desc: 'tea',
    hidden: true,
    run: (_a, { print }) => print([txt('    ( (', 'dim')], [txt('     ) )', 'dim')], [txt('  ........')], [txt('  |      |]')], [txt('  \\      /')], [txt("   `----'")], [txt('Tea is ready. Much better.', 'accent')]),
  },
  make: {
    desc: 'make',
    hidden: true,
    run: (args, c) => {
      const what = args.join(' ').toLowerCase()
      if (what === 'coffee') return EGG_COMMANDS.coffee.run([], c)
      if (what === 'me a sandwich') return c.print(err('What? Make it yourself.'))
      c.print(err(`make: *** No rule to make target '${args[0] ?? 'all'}'. Stop.`))
    },
  },
  xyzzy: {
    desc: 'magic',
    hidden: true,
    run: (_a, { print }) => {
      print([txt('Nothing happens.')])
      findEgg('xyzzy')
    },
  },
  plugh: { desc: 'magic', hidden: true, run: (_a, { print }) => print([txt('A hollow voice says "Fool."')]) },
  '42': {
    desc: 'the answer',
    hidden: true,
    run: (_a, { print }) => {
      print([txt('Yes, 42. Now what was the question?')])
      findEgg('answer')
    },
  },
  hello: { desc: 'say hi', hidden: true, run: (_a, { print }) => print([txt('Hi! Thanks for stopping by. Try '), cmd('neofetch'), txt(' or '), cmd('games'), txt('.')]) },
  hi: { desc: 'say hi', hidden: true, run: (a, c) => EGG_COMMANDS.hello.run(a, c) },
  ping: {
    desc: 'ping a host',
    hidden: true,
    run: (args) => {
      const host = args[0] ?? 'danishali.dev'
      later(0, [txt(`PING ${host}: 56 data bytes`)])
      for (let i = 0; i < 4; i++) later(400 * (i + 1), [txt(`64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${(Math.random() * 3 + 0.4).toFixed(1)} ms`)])
      later(1800, [txt('4 packets transmitted, 4 received, 0% packet loss. Fast, because it never left your browser.', 'dim')])
    },
  },
  uname: {
    desc: 'system name',
    hidden: true,
    run: (args, { print }) => print([txt(args.includes('-a') ? `PaperOS danishali.dev 1.0 ${browserName()} dsh` : 'PaperOS')]),
  },
  man: {
    desc: 'manual pages',
    hidden: true,
    run: (args, { print }) => {
      if (!args[0]) return print([txt('What manual page do you want?')])
      print([txt(`man: try \`${args[0]} --help\`, or just `, 'dim'), cmd('help')])
    },
  },
  git: {
    desc: 'git',
    hidden: true,
    run: (args, { print }) => {
      const sub = args[0]
      if (sub === 'status') return print([txt('On branch main')], [txt('nothing to commit, working tree clean', 'dim')])
      if (sub === 'blame') return print([txt('Danish (every line, no regrets)')])
      if (sub === 'push') return print(err('git push: permission denied. This is the live site, not a repo you own.'))
      print([txt('The real repo lives on GitHub: ', 'dim'), { t: 'github.com/Danish12196', href: 'https://github.com/Danish12196' }])
    },
  },
}
