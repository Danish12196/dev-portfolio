// `scores`: prints the leaderboards in the terminal.
import type { Command } from '../terminal/commands'
import { cmd, txt } from '../terminal/lines'
import { useTerm } from '../terminal/store'
import { fetchBoard, formatMs, type Board } from './api'

const TITLES: Record<Board, string> = { snake: 'Snake high scores', achievements: 'Fastest to find every achievement' }

async function printBoard(board: Board) {
  const { push } = useTerm.getState()
  const r = await fetchBoard(board)
  push([txt(TITLES[board], 'bold')])
  if (!r.ok) return push([txt(`  ${r.error}`, 'dim')])
  if (!r.entries.length) return push([txt('  nobody yet. Be the first.', 'dim')])
  r.entries.forEach((e, i) =>
    push([
      txt(`  ${String(i + 1).padStart(2)}  `, 'dim'),
      txt(e.name.padEnd(17)),
      txt(board === 'snake' ? String(e.value) : formatMs(e.value), 'accent'),
    ]),
  )
}

export function showScores(want: Board[] = ['snake', 'achievements']) {
  const { push } = useTerm.getState()
  push([txt('loading…', 'dim')])
  ;(async () => {
    for (const b of want) await printBoard(b)
    push([txt('Play ', 'dim'), cmd('snake'), txt(' to get on the board.', 'dim')])
  })()
}

export const LEADERBOARD_COMMANDS: Record<string, Command> = {
  scores: {
    desc: 'leaderboards for snake and achievements',
    usage: 'scores [snake|achievements]',
    run: (args) => {
      const want: Board[] = args[0]?.startsWith('a') ? ['achievements'] : args[0]?.startsWith('s') ? ['snake'] : ['snake', 'achievements']
      showScores(want)
    },
  },
  leaderboard: { desc: 'same as scores', hidden: true, run: (a, c) => LEADERBOARD_COMMANDS.scores.run(a, c) },
  highscores: { desc: 'same as scores', hidden: true, run: (a, c) => LEADERBOARD_COMMANDS.scores.run(a, c) },
}
