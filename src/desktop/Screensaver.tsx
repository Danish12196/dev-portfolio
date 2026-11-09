import { useEffect, useRef, useState } from 'react'
import { usePower } from '../shell/power'
import { IDLE_MS, onScreensaverRequest } from '../shell/screensaver'

const COLOURS = ['var(--peach)', 'var(--mint)', 'var(--btn-min)', 'var(--btn-close)', 'var(--btn-max)']
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Things that count as someone still being here even with no input on the page. */
function busy() {
  // Typing or clicking inside a live demo happens in its iframe, where the page can't see it.
  if (document.activeElement?.tagName === 'IFRAME') return true
  // Nobody wants a screensaver over the video they are watching.
  return [...document.querySelectorAll('video')].some((v) => !v.paused && !v.ended)
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      <div className="ss-time">{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
      <div className="ss-date">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    </>
  )
}

/** A paper card with the clock that drifts around and bounces off the edges. */
function Drifter() {
  const ref = useRef<HTMLDivElement>(null)
  const [colour, setColour] = useState(0)
  const [corners, setCorners] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    let x = Math.random() * Math.max(0, window.innerWidth - el.offsetWidth)
    let y = Math.random() * Math.max(0, window.innerHeight - el.offsetHeight)
    let dx = 70 * (Math.random() < 0.5 ? -1 : 1)
    let dy = 55 * (Math.random() < 0.5 ? -1 : 1)
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const maxX = window.innerWidth - el.offsetWidth
      const maxY = window.innerHeight - el.offsetHeight
      x += dx * dt
      y += dy * dt
      let hitX = false
      let hitY = false
      if (x <= 0 || x >= maxX) {
        x = Math.min(Math.max(x, 0), maxX)
        dx = -dx
        hitX = true
      }
      if (y <= 0 || y >= maxY) {
        y = Math.min(Math.max(y, 0), maxY)
        dy = -dy
        hitY = true
      }
      if (hitX || hitY) setColour((c) => (c + 1) % COLOURS.length)
      if (hitX && hitY) setCorners((c) => c + 1)
      el.style.transform = `translate(${x}px, ${y}px)`
      raf = requestAnimationFrame(tick)
    }
    el.style.transform = `translate(${x}px, ${y}px)`
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="ss-card" ref={ref} style={{ ['--ss-colour' as string]: COLOURS[colour] }}>
      <div className="ss-badge" aria-hidden="true">
        da
      </div>
      <div>
        <Clock />
        <div className="ss-hint">{corners ? `Hit a corner ${corners === 1 ? 'once' : `${corners} times`}. Move the mouse to wake up.` : 'Move the mouse or press a key to wake up.'}</div>
      </div>
    </div>
  )
}

/** Starts after IDLE_MS without input. Any key, click or real mouse movement wakes the desktop. */
export default function Screensaver() {
  const [on, setOn] = useState(false)
  const booted = usePower((s) => s.phase === 'on')

  useEffect(() => onScreensaverRequest(() => setOn(true)), [])

  // Count down while the desktop is quiet.
  useEffect(() => {
    if (on || !booted) return
    let lastInput = Date.now()
    const poke = () => (lastInput = Date.now())
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, poke, { capture: true, passive: true }))
    const t = setInterval(() => {
      if (document.hidden || busy()) return poke()
      if (Date.now() - lastInput >= IDLE_MS) setOn(true)
    }, 1000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, poke, { capture: true }))
      clearInterval(t)
    }
  }, [on, booted])

  // Wake up. The key or click that wakes it is swallowed so it doesn't land on a window.
  useEffect(() => {
    if (!on) return
    const since = Date.now()
    let origin: { x: number; y: number } | null = null
    const wake = (e: Event) => {
      // A held Enter (from running `screensaver`) shouldn't wake it straight away.
      if (e.type === 'keydown' && Date.now() - since < 600) return
      if (e.type !== 'wheel') e.preventDefault()
      e.stopPropagation()
      setOn(false)
    }
    const move = (e: PointerEvent) => {
      // A nudged desk or a jittery trackpad isn't somebody coming back.
      origin ??= { x: e.clientX, y: e.clientY }
      if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 24) wake(e)
    }
    window.addEventListener('keydown', wake, true)
    window.addEventListener('pointerdown', wake, true)
    window.addEventListener('wheel', wake, true)
    window.addEventListener('pointermove', move, true)
    return () => {
      window.removeEventListener('keydown', wake, true)
      window.removeEventListener('pointerdown', wake, true)
      window.removeEventListener('wheel', wake, true)
      window.removeEventListener('pointermove', move, true)
    }
  }, [on])

  if (!on) return null
  return (
    <div className="screensaver" role="dialog" aria-label="Screensaver. Press any key to wake up." onClick={(e) => e.stopPropagation()}>
      <Drifter />
    </div>
  )
}
