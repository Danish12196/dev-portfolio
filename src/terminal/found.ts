import { useTerm } from './store'
import { cmd, txt } from './lines'

/** Every hidden secret, with the hint `eggs` gives for the ones you haven't found yet. */
export const EGGS: Record<string, string> = {
  sudo: 'Ask for superpowers.',
  rm: 'Try deleting everything. What could go wrong?',
  vim: 'Open a certain editor, then try to leave.',
  hack: 'Every movie hacker types the same word.',
  coffee: 'The developer runs on a hot drink.',
  xyzzy: 'A magic word from a very old adventure game.',
  answer: 'Life, the universe and everything.',
  dotfile: 'Some files hide from a plain ls.',
  escape: 'Try to climb above your home folder.',
  konami: '↑ ↑ ↓ ↓ ← → ← → …',
}

const KEY = 'devportfolio.eggs'

function load(): Set<string> {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(saved) ? saved.filter((id) => id in EGGS) : [])
  } catch {
    return new Set()
  }
}

let found = load()

export function foundEggs() {
  return found
}

/** Marks a secret as found. Says so the first time, and every time after stays quiet. */
export function findEgg(id: keyof typeof EGGS & string) {
  if (found.has(id)) return
  found = new Set(found).add(id)
  try {
    localStorage.setItem(KEY, JSON.stringify([...found]))
  } catch {
    /* storage blocked */
  }
  const n = found.size
  const total = Object.keys(EGGS).length
  setTimeout(
    () =>
      useTerm
        .getState()
        .push([
          txt(`★ secret found (${n}/${total})`, 'bold'),
          ...(n === total ? [txt('  You found them all. Thanks for poking around.', 'accent')] : [txt('  type ', 'dim'), cmd('eggs'), txt(' for a hint', 'dim')]),
        ]),
    0,
  )
}

export function resetEggs() {
  found = new Set()
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage blocked */
  }
}
