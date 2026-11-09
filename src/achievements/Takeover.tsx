import { useEffect, useRef, useState, type FormEvent } from 'react'
import { unlock } from '.'
import { goHome, takeover, useTakeover, type Takeover as Mode } from './effects'

/** Any key, click or tap after a short delay calls `go`. The delay stops the key that started it from ending it. */
function useAnyKey(go: () => void, delay = 900) {
  const ready = useRef(false)
  const goRef = useRef(go)
  useEffect(() => {
    goRef.current = go
  })
  useEffect(() => {
    const t = setTimeout(() => (ready.current = true), delay)
    const on = (e: Event) => {
      if (!ready.current) return
      if (e instanceof KeyboardEvent && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      e.preventDefault()
      e.stopPropagation()
      goRef.current()
    }
    window.addEventListener('keydown', on, true)
    window.addEventListener('pointerdown', on, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', on, true)
      window.removeEventListener('pointerdown', on, true)
    }
  }, [delay])
}

function Bsod() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPct((p) => (p >= 100 ? 100 : Math.min(100, p + Math.ceil(Math.random() * 14)))), 260)
    return () => clearInterval(t)
  }, [])
  useAnyKey(() => goHome('bsod'), 1200)
  return (
    <div className="to to-bsod" role="alertdialog" aria-label="PaperOS crashed">
      <div className="bsod-inner">
        <div className="bsod-face">:(</div>
        <p className="bsod-big">PaperOS ran into a problem it couldn&apos;t handle. Someone typed rm -rf /.</p>
        <p>We&apos;re collecting absolutely no error info, and then we&apos;ll pretend to restart for you.</p>
        <p className="bsod-pct">{pct}% complete</p>
        <div className="bsod-foot">
          <div className="bsod-qr" aria-hidden="true">
            {Array.from({ length: 49 }, (_, i) => (
              <span key={i} style={{ opacity: (i * 7919) % 3 ? 1 : 0 }} />
            ))}
          </div>
          <div>
            <p>For more information about this issue, don&apos;t search online.</p>
            <p>Stop code: USER_DELETED_EVERYTHING_ON_PURPOSE</p>
            <p className="bsod-any">{pct >= 100 ? 'Press any key to continue' : ' '}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const HEX = '0123456789abcdef'
const LOOT = ['projects/', 'todo.txt', 'unfinished-side-projects.zip', 'memes/', 'game-jam-coffee-receipts.csv', 'passwords.txt (it just says hunter2)']

function Hack() {
  const [rows, setRows] = useState<string[]>([])
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const t = setInterval(() => {
      const row = Array.from({ length: 8 }, () => Array.from({ length: 4 }, () => HEX[Math.floor(Math.random() * 16)]).join('')).join(' ')
      setRows((r) => [...r.slice(-40), `0x${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}  ${row}`])
    }, 40)
    const p1 = setTimeout(() => setPhase(1), 1600)
    const p2 = setTimeout(() => setPhase(2), 1600 + LOOT.length * 380 + 400)
    return () => {
      clearInterval(t)
      clearTimeout(p1)
      clearTimeout(p2)
    }
  }, [])
  useAnyKey(() => goHome('hack'), 2400)
  return (
    <div className="to to-hack" role="alertdialog" aria-label="You have been hacked">
      <pre className="hack-rain" aria-hidden="true">{rows.join('\n')}</pre>
      {phase >= 1 && (
        <div className="hack-box">
          <div className="hack-title">SYSTEM COMPROMISED</div>
          <ul>
            {LOOT.map((f, i) => (
              <li key={f} style={{ animationDelay: `${i * 380}ms` }}>
                uploading {f} … done
              </li>
            ))}
          </ul>
          <p className="hack-any">{phase >= 2 ? 'press any key to accept your fate' : ' '}</p>
        </div>
      )}
    </div>
  )
}

function Restart() {
  return (
    <div className="to to-power" role="alert">
      <div className="power-spin" aria-hidden="true" />
      <p>Restarting PaperOS…</p>
    </div>
  )
}

function Shutdown() {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      setStage(1)
      unlock('shutdown')
    }, 1700)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="to to-power" role="alertdialog" aria-label="Shut down">
      {stage === 0 ? (
        <>
          <div className="power-spin" aria-hidden="true" />
          <p>Shutting down…</p>
        </>
      ) : (
        <div className="power-fail">
          <p className="power-big">Shutdown failed.</p>
          <p>PaperOS is a website. It doesn&apos;t have an off switch.</p>
          <p className="power-dim">(You could close the tab. Please don&apos;t.)</p>
          <button type="button" className="pill" autoFocus onClick={() => takeover(null)}>
            Fine, back to the desktop
          </button>
        </div>
      )}
    </div>
  )
}

function WordPress() {
  const [tries, setTries] = useState(0)
  const leave = () => takeover(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTries((t) => t + 1)
    unlock('wordpress')
  }
  return (
    <div className="to to-wp" role="dialog" aria-label="Log in">
      <form className="wp-card" onSubmit={submit}>
        <div className="wp-logo" aria-hidden="true">
          W?
        </div>
        {tries > 0 && (
          <p className="wp-error" role="alert">
            {tries === 1 ? "Error: this site isn't WordPress. It never was." : 'Still not WordPress. Bots try this page all day too, you know.'}
          </p>
        )}
        <label>
          Username or email address
          <input name="log" autoComplete="off" autoFocus />
        </label>
        <label>
          Password
          <input name="pwd" type="password" autoComplete="off" />
        </label>
        <button type="submit" className="pill pill-dark">
          Log in
        </button>
        <button type="button" className="wp-back" onClick={leave}>
          ← Go to the actual site
        </button>
      </form>
    </div>
  )
}

const VIEWS: Record<Mode, () => React.JSX.Element> = { bsod: Bsod, hack: Hack, restart: Restart, shutdown: Shutdown, wordpress: WordPress }

export default function TakeoverLayer() {
  const mode = useTakeover((s) => s.mode)
  if (!mode) return null
  const View = VIEWS[mode]
  return <View />
}
