import { useEffect, useRef, useState, type FormEvent } from 'react'
import { fetchBoard, rememberName, savedName, snakeSubmit, type Entry } from './api'
import { nameProblem, tidyName, NAME_MAX } from './names'
import type { Move } from './snakeEngine'

interface Finished {
  token: string | null
  score: number
  cols: number
  rows: number
  ticks: number
  moves: Move[]
}

/** The game-over panel in snake: put your name on the board, and see the top 10. */
export default function SnakeBoard({ game, onDone }: { game: Finished; onDone: () => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [offline, setOffline] = useState('')
  const [name, setName] = useState(savedName)
  const [msg, setMsg] = useState('')
  const [phase, setPhase] = useState<'form' | 'sending' | 'done'>('form')
  const [mine, setMine] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let live = true
    fetchBoard('snake').then((r) => {
      if (!live) return
      if (r.ok) setEntries(r.entries)
      else setOffline(r.error)
    })
    return () => {
      live = false
    }
  }, [])

  const lowest = entries && entries.length >= 10 ? entries[entries.length - 1].value : 0
  const qualifies = !!game.token && !offline && entries !== null && game.score > lowest

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!game.token) return
    const clean = tidyName(name)
    const problem = nameProblem(clean)
    if (problem) return setMsg(problem)
    setPhase('sending')
    setMsg('')
    const r = await snakeSubmit({ token: game.token, name: clean, cols: game.cols, rows: game.rows, ticks: game.ticks, moves: game.moves, score: game.score })
    if (!r.ok) {
      setPhase('form')
      return setMsg(r.error)
    }
    rememberName(clean)
    setMine(clean.toLowerCase())
    setPhase('done')
    setMsg(r.rank ? `You're #${r.rank}${r.improved ? '' : ' (your earlier score was higher)'}.` : 'Saved.')
    const b = await fetchBoard('snake')
    if (b.ok) setEntries(b.entries)
    onDone()
  }

  return (
    <div className="lb-panel" aria-live="polite">
      {qualifies && phase !== 'done' && (
        <form
          className="lb-form"
          onSubmit={submit}
          // Keys typed here are for the name, not the snake.
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Escape') onDone()
          }}
        >
          <label htmlFor="lb-name">High score! Name for the board</label>
          <div className="lb-row">
            <input
              id="lb-name"
              ref={inputRef}
              value={name}
              maxLength={NAME_MAX}
              autoComplete="nickname"
              spellCheck={false}
              onChange={(e) => setName(e.target.value)}
              disabled={phase === 'sending'}
            />
            <button type="submit" disabled={phase === 'sending'}>
              {phase === 'sending' ? '…' : 'save'}
            </button>
          </div>
        </form>
      )}
      {msg && <p className="lb-msg">{msg}</p>}
      {offline ? (
        <p className="lb-msg lb-dim">{offline}</p>
      ) : !game.token ? (
        <p className="lb-msg lb-dim">This game started offline, so it can't go on the board.</p>
      ) : null}
      {entries && entries.length > 0 && (
        <ol className="lb-list">
          {entries.map((e, i) => (
            <li key={e.name} className={e.name.toLowerCase() === mine ? 'lb-me' : undefined}>
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">{e.name}</span>
              <span className="lb-value">{e.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
