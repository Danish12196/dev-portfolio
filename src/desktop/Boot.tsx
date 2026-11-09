import { useCallback, useEffect, useState } from 'react'
import { projects } from '../fs'
import { usePower } from '../shell/power'

type Screen = 'post' | 'splash'

const SPLASH_STEPS = ['Waking the window manager', 'Mounting /projects', 'Warming up the terminal', 'Brewing coffee']

function postLines(): [string, string][] {
  const n = projects().length
  return [
    ['DA-BIOS v2.6   (c) 2026 Danish Ali', ''],
    ['CPU  : one developer @ 3 coffees/hr', 'OK'],
    ['RAM  : 16384K', 'OK'],
    ['DISK : /projects', `${n} found`],
    ['NET  : danishali.dev', 'up'],
    ['BOOT : dev/portfolio', '...'],
  ]
}

/** Firmware text in the terminal's green, a line at a time, like a machine powering on. */
function Post({ onDone }: { onDone: () => void }) {
  const [lines] = useState(postLines)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (shown >= lines.length) {
      const t = setTimeout(onDone, 380)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 420 : 170)
    return () => clearTimeout(t)
  }, [shown, lines.length, onDone])
  return (
    <div className="boot-post">
      <pre>
        {lines.slice(0, shown).map(([l, r], i) => (
          <div key={i} className={i === 0 ? 'boot-head' : undefined}>
            {r ? `${l} ${'.'.repeat(Math.max(2, 40 - l.length))} ${r}` : l}
          </div>
        ))}
        <span className="boot-cursor" />
      </pre>
    </div>
  )
}

/** The Soft Paper logo and a chunky progress bar. */
function Splash({ duration, onDone }: { duration: number; onDone: () => void }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const per = duration / SPLASH_STEPS.length
    const t = setInterval(() => setStep((s) => Math.min(s + 1, SPLASH_STEPS.length - 1)), per)
    const done = setTimeout(onDone, duration)
    return () => {
      clearInterval(t)
      clearTimeout(done)
    }
  }, [duration, onDone])
  return (
    <div className="boot-splash">
      <div className="boot-logo" aria-hidden="true">
        da
      </div>
      <div className="boot-name">dev/portfolio</div>
      <div className="boot-bar" aria-hidden="true">
        <span style={{ animationDuration: `${duration}ms` }} />
      </div>
      <div className="boot-step">{SPLASH_STEPS[step]}</div>
    </div>
  )
}

/**
 * The start-up screen. Plays on every page load and after a restart; any key or
 * click skips it. Reloads in the same tab and reduced motion get the short version.
 */
export default function Boot() {
  const { phase, short, boots, setPhase } = usePower()
  // What is on screen. It stays put while the boot screen fades out.
  const live: Screen | null = phase === 'post' ? (short ? null : 'post') : phase === 'splash' ? 'splash' : null
  const [screen, setScreen] = useState<Screen | null>(live)
  const [leaving, setLeaving] = useState(false)
  if (live && live !== screen) setScreen(live)
  if (live && leaving) setLeaving(false)

  const toSplash = useCallback(() => setPhase('splash'), [setPhase])
  const finish = useCallback(() => {
    setLeaving(true)
    setPhase('on')
  }, [setPhase])

  useEffect(() => {
    if (phase === 'post' && short) setPhase('splash')
  }, [phase, short, setPhase, boots])

  // Any key skips the rest, and doesn't reach whatever is underneath.
  useEffect(() => {
    if (phase === 'on') return
    const skip = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      finish()
    }
    window.addEventListener('keydown', skip, true)
    return () => window.removeEventListener('keydown', skip, true)
  }, [phase, finish])

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => {
      setLeaving(false)
      setScreen(null)
    }, 450)
    return () => clearTimeout(t)
  }, [leaving])

  if (phase === 'on' && !leaving) return null
  return (
    <div className={`boot${leaving ? ' leaving' : ''}${screen === 'post' ? ' boot-dark' : ''}`} role="status" aria-label="Starting up" onPointerDown={finish}>
      {screen === 'post' && <Post key={boots} onDone={toSplash} />}
      {screen === 'splash' && <Splash key={boots} duration={short ? 700 : 1500} onDone={finish} />}
      {!leaving && (
        <div className="boot-skip">
          <span className="keys">press any key to skip</span>
          <span className="touch">tap to skip</span>
        </div>
      )}
    </div>
  )
}
