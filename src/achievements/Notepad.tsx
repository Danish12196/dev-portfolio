import { useEffect, useState } from 'react'
import { ACHIEVEMENTS, formatDuration, getProgress, resetAchievements, runSeed, unlock, useAchievements } from '.'

function useActiveTime() {
  const [ms, setMs] = useState(() => getProgress().activeMs)
  const finishedAt = useAchievements((s) => s.finishedAt)
  const runId = useAchievements((s) => s.runId)
  useEffect(() => {
    setMs(getProgress().activeMs)
    if (finishedAt) return
    const t = setInterval(() => setMs(getProgress().activeMs), 1000)
    return () => clearInterval(t)
  }, [finishedAt, runId])
  return ms
}

/** The toast that pops up for a moment on every unlock. */
export function AchievementToast() {
  const latest = useAchievements((s) => s.latest)
  const found = useAchievements((s) => Object.keys(s.found).length)
  const [shown, setShown] = useState<typeof latest>(null)
  useEffect(() => {
    if (!latest) return
    setShown(latest)
    const t = setTimeout(() => setShown(null), 4200)
    return () => clearTimeout(t)
  }, [latest])
  const a = shown && ACHIEVEMENTS.find((x) => x.id === shown.id)
  if (!a) return null
  return (
    <div className="ach-toast" role="status" key={shown.at}>
      <span className="ach-toast-star" aria-hidden="true">
        ★
      </span>
      <div>
        <div className="ach-toast-kicker">
          Achievement unlocked · {found}/{ACHIEVEMENTS.length}
        </div>
        <div className="ach-toast-title">{a.title}</div>
      </div>
    </div>
  )
}

/**
 * The notepad on the right: appears after the first find, keeps score, gives hints,
 * times the run and can start it over.
 */
export default function Notepad() {
  const { found, finishedAt, notepadOpen, setNotepad, runId } = useAchievements()
  const [hints, setHints] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState(false)
  const ms = useActiveTime()
  const count = Object.keys(found).length

  useEffect(() => setHints(new Set()), [runId])
  const fold = (f: boolean) => setNotepad(!f)

  if (count === 0) return null

  // Found ones first, in the order they were found; then the rest, shuffled per run so a second run reads differently.
  const done = ACHIEVEMENTS.filter((a) => a.id in found).sort((a, b) => found[a.id] - found[b.id])
  const left = ACHIEVEMENTS.filter((a) => !(a.id in found)).sort((a, b) => runSeed(a.id) - runSeed(b.id))

  if (!notepadOpen) {
    return (
      <button type="button" className="np-tab" onClick={() => fold(false)} aria-label={`Open achievements notepad, ${count} of ${ACHIEVEMENTS.length} found`}>
        <span aria-hidden="true">★</span> {count}/{ACHIEVEMENTS.length}
      </button>
    )
  }

  return (
    <aside className="notepad" aria-label="Achievements">
      <header className="np-head">
        <span className="np-title">notes.txt</span>
        <button type="button" className="np-fold" onClick={() => fold(true)} aria-label="Fold the notepad away">
          –
        </button>
      </header>
      <div className="np-body">
        <div className="np-score">
          <span>
            <b>{count}</b> of {ACHIEVEMENTS.length} found
          </span>
          <span className="np-time" title="Time with the site open during this run">
            {finishedAt ? '⏱ ' : ''}
            {formatDuration(ms)}
          </span>
        </div>
        <div className="np-bar" aria-hidden="true">
          <span style={{ width: `${(count / ACHIEVEMENTS.length) * 100}%` }} />
        </div>
        {finishedAt && <p className="np-done">All found. You are officially a power user.</p>}
        {/* Leaderboard slot: a "submit your time" button can go here. */}
        <ol className="np-list">
          {done.map((a) => (
            <li key={a.id} className="np-found">
              <span className="np-check" aria-hidden="true">
                ✓
              </span>
              <span>
                <span className="np-name">{a.title}</span>
                <span className="np-sub">{a.done}</span>
              </span>
            </li>
          ))}
          {left.slice(0, 3).map((a) => (
            <li key={a.id} className="np-locked">
              <span className="np-check" aria-hidden="true">
                ·
              </span>
              {hints.has(a.id) ? (
                <span className="np-sub np-hint">{a.hint}</span>
              ) : (
                <button type="button" className="np-hint-btn" onClick={() => setHints(new Set(hints).add(a.id))}>
                  ??? <span>hint</span>
                </button>
              )}
            </li>
          ))}
          {left.length > 3 && (
            <li className="np-locked np-more">
              <span className="np-check" aria-hidden="true">
                +
              </span>
              <span className="np-sub">{left.length - 3} more to find</span>
            </li>
          )}
        </ol>
        <footer className="np-foot">
          {confirm ? (
            <span className="np-confirm">
              Start over? Your time resets too.{' '}
              <button
                type="button"
                onClick={() => {
                  resetAchievements()
                  setConfirm(false)
                }}
              >
                Yes, reset
              </button>{' '}
              <button type="button" onClick={() => setConfirm(false)}>
                No
              </button>
            </span>
          ) : (
            <button type="button" className="np-reset" onClick={() => setConfirm(true)}>
              Reset achievements
            </button>
          )}
          <p className="np-credit">
            Some of these are borrowed, with love, from{' '}
            <a href="https://lupine.dev" target="_blank" rel="noreferrer">
              lupine.dev
            </a>
            .
          </p>
        </footer>
      </div>
    </aside>
  )
}

/** A tiny star hidden somewhere. Click it to collect it; it moves every run. */
export function Star({ id, className = '', style }: { id: 'star-sky' | 'star-menu' | 'star-term'; className?: string; style?: React.CSSProperties }) {
  const have = useAchievements((s) => id in s.found)
  const [pop, setPop] = useState(false)
  if (have && !pop) return null
  return (
    <button
      type="button"
      className={`star${pop ? ' star-pop' : ''} ${className}`}
      style={style}
      aria-label="A small star"
      onClick={(e) => {
        e.stopPropagation()
        setPop(true)
        unlock(id)
        setTimeout(() => setPop(false), 700)
      }}
    >
      ✦
    </button>
  )
}
