import { useState, type FormEvent } from 'react'
import { formatMs, rememberName, savedName } from './api'
import { NAME_MAX, nameProblem, tidyName } from './names'
import { retryFinish, submitRun, useRun } from './achievementRun'
import { openTerminal } from '../shell/opener'
import { showScores } from './commands'

function showBoard() {
  openTerminal()
  showScores(['achievements'])
}

/** In the notepad once every achievement is found: put your time on the board. */
export default function AchBoard() {
  const { ranked, token, finish, ms, rank, error } = useRun()
  const [name, setName] = useState(savedName)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  if (!ranked || !token) {
    return <p className="lb-ach-note">This run wasn't timed for the leaderboard. Reset to start a timed one.</p>
  }
  if (!finish) {
    return (
      <p className="lb-ach-note">
        {error ? `Couldn't record your time (${error}). ` : 'Recording your time… '}
        {error && (
          <button type="button" className="lb-ach-link" onClick={() => void retryFinish()}>
            try again
          </button>
        )}
      </p>
    )
  }
  if (rank !== null) {
    return (
      <p className="lb-ach-note">
        You're <b>#{rank}</b> on the board.{' '}
        <button type="button" className="lb-ach-link" onClick={showBoard}>
          see it
        </button>
      </p>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean = tidyName(name)
    const problem = nameProblem(clean)
    if (problem) return setMsg(problem)
    setSending(true)
    setMsg('')
    const r = await submitRun(clean)
    setSending(false)
    if (!r.ok) return setMsg(r.error)
    rememberName(clean)
  }

  return (
    <form className="lb-ach" onSubmit={submit}>
      <label htmlFor="lb-ach-name">
        Your time: <b>{formatMs(ms ?? 0)}</b>. Name for the leaderboard
      </label>
      <div className="lb-ach-row">
        <input
          id="lb-ach-name"
          value={name}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending}>
          {sending ? '…' : 'save'}
        </button>
      </div>
      {msg && <p className="lb-ach-msg">{msg}</p>}
    </form>
  )
}
