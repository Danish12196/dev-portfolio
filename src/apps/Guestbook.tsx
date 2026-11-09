import { useEffect, useRef, useState, type FormEvent } from 'react'

interface Note {
  id: string
  name: string
  message: string
  created: string
}

const NAME_MAX = 40
const MESSAGE_MAX = 500

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; text: string }

function when(iso: string) {
  const d = new Date(iso.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Visitors leave a note; it reaches Danish privately and shows here only once he approves it. */
export default function Guestbook() {
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const shownAt = useRef(Date.now())

  useEffect(() => {
    let live = true
    fetch('/api/guestbook')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { notes: Note[] }) => live && setNotes(d.notes))
      .catch(() => live && setLoadError(true))
    return () => {
      live = false
    }
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (status.kind === 'sending') return
    setStatus({ kind: 'sending' })
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message, website, elapsed: Date.now() - shownAt.current }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) return setStatus({ kind: 'error', text: data.error ?? 'Something went wrong. Try again in a bit.' })
      setStatus({ kind: 'sent' })
      setMessage('')
    } catch {
      setStatus({ kind: 'error', text: 'Could not reach the guestbook. Are you offline?' })
    }
  }

  return (
    <div className="gb">
      <section className="gb-sign" aria-labelledby="gb-sign-title">
        <h2 id="gb-sign-title">Sign the guestbook</h2>
        <p className="gb-sub">Notes come to me first. I read every one, and the nice ones get pinned below.</p>
        {status.kind === 'sent' ? (
          <div className="gb-thanks" role="status">
            <strong>Thanks, {name.trim() || 'friend'}!</strong> Your note is on its way to me. It shows up here once I&apos;ve read it.
            <button type="button" className="pill" onClick={() => ((shownAt.current = Date.now()), setStatus({ kind: 'idle' }))}>
              Write another
            </button>
          </div>
        ) : (
          <form className="gb-form" onSubmit={submit}>
            <label>
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} required autoComplete="nickname" placeholder="Ada" />
            </label>
            <label>
              <span>Note</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={MESSAGE_MAX} required rows={4} placeholder="Say hi, leave a tip, tell me what broke…" />
              <span className="gb-count" aria-hidden="true">
                {message.length}/{MESSAGE_MAX}
              </span>
            </label>
            {/* Hidden from people; bots that fill every field get politely ignored. */}
            <label className="gb-hp" aria-hidden="true">
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
            <div className="gb-row">
              <button type="submit" className="pill pill-dark" disabled={status.kind === 'sending'}>
                {status.kind === 'sending' ? 'Sending…' : 'Send note'}
              </button>
              {status.kind === 'error' && (
                <p className="gb-error" role="alert">
                  {status.text}
                </p>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="gb-notes" aria-labelledby="gb-notes-title">
        <h2 id="gb-notes-title">Pinned notes</h2>
        {loadError ? (
          <p className="gb-empty">The notes didn&apos;t load. They&apos;ll be back.</p>
        ) : notes === null ? (
          <p className="gb-empty">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="gb-empty">Nothing pinned yet. Be the first.</p>
        ) : (
          <ul>
            {notes.map((n, i) => (
              <li key={n.id} className="gb-note" style={{ ['--tilt' as string]: `${((i * 7) % 5) - 2}deg` }}>
                <p>{n.message}</p>
                <footer>
                  <span>{n.name}</span>
                  <time dateTime={n.created.replace(' ', 'T')}>{when(n.created)}</time>
                </footer>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
