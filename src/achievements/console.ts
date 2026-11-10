// A hello for anyone who opens DevTools, and a login hidden in the console (an idea from lupine.dev).
import { ACHIEVEMENTS, getProgress, isFound, unlock } from '.'

const big = 'font: 800 28px/1.2 "JetBrains Mono", monospace; color: #3cff7a; background: #0a0f0a; padding: 6px 12px; border-radius: 6px'
const body = 'font: 500 13px/1.6 "JetBrains Mono", monospace'
const accent = 'font: 700 13px/1.6 "JetBrains Mono", monospace; color: #f7b267'

const EYES = String.raw`
    .-""-.      .-""-.
   /  _   \    /  _   \
  |  (o)  |    |  (o)  |
   \     /      \     /
    '-..-'      '-..-'
`

const PASSWORD = 'hunter2'
let wrong = 0

const danish = {
  help() {
    console.log(
      '%cdanish.help()%c        this\n%cdanish.login(pw)%c     you know what this does\n%cdanish.whoami()%c      who made this\n%cdanish.progress()%c    your achievements so far',
      accent, body, accent, body, accent, body, accent, body,
    )
    return '¯\\_(ツ)_/¯'
  },
  login(password?: string) {
    if (isFound('console')) return console.log('%cAlready logged in as root. Power corrupts.', body)
    if (password === undefined) return console.log('%cusage: danish.login("password")', body)
    if (String(password).trim().toLowerCase() !== PASSWORD) {
      wrong++
      const lines = ['Access denied.', 'Nope. Still denied.', 'Wrong again. Someone in the terminal was leaking passwords earlier, you know.']
      return console.log(`%c${lines[Math.min(wrong, lines.length) - 1]}`, 'font: 700 13px/1.6 monospace; color: #ff7a6b')
    }
    console.log('%cACCESS GRANTED', big)
    console.log('%cWelcome back, root. Everything here was public anyway, but well done.', body)
    unlock('console')
  },
  whoami() {
    console.log('%cDanish Ali, developer in Dubai. %chttps://github.com/danishali-codes', body, accent)
  },
  progress() {
    const p = getProgress()
    console.table(ACHIEVEMENTS.map((a) => ({ achievement: a.id in p.found ? a.title : '???', found: a.id in p.found ? new Date(p.found[a.id]).toLocaleTimeString() : '' })))
    return `${Object.keys(p.found).length}/${p.total}`
  },
  toString: () => 'try danish.help()',
}

export function greet() {
  ;(window as unknown as { danish: typeof danish }).danish = danish
  console.log(`%c${EYES}`, 'font: 700 12px/1.1 monospace; color: #3cff7a')
  console.log('%cpsst. I see you sneaking around in the console.', big)
  console.log(
    "%cEither you're a developer, or someone on the internet told you to paste something in here.\nIf it's the second one: please don't, ever, on any site.\n\nIf it's the first one: hi! There's a login hidden in here. %cdanish.help()%c to start.",
    body, accent, body,
  )
  console.log('%cThe console login idea is borrowed from lupine.dev, a site full of great secrets.', 'font: 500 11px monospace; color: #888')
}
