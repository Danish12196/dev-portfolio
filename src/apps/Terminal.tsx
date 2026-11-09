import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { displayPath, getNode } from '../fs'
import { openNode } from '../shell/opener'
import { complete, execute, WELCOME, type Line, type Seg } from '../terminal/commands'
import { unlock } from '../achievements'
import { txt } from '../terminal/lines'
import { useTerm } from '../terminal/store'


const Snake = lazy(() => import('../terminal/Snake'))
const Matrix = lazy(() => import('../terminal/Matrix'))

useTerm.setState({ lines: WELCOME })

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

const SHORTCUTS = ['help', 'projects', 'ls', 'cd ..', 'open fuloos', 'play jeopardy', 'games', 'neofetch', 'snake', 'exit']

export default function Terminal({ onExit, showShortcuts = false }: { onExit: () => void; showShortcuts?: boolean }) {
  const { lines, cwd, history, handler, program, skin, push, clear, setCwd, addHistory, capture, launch } = useTerm()
  const [input, setInput] = useState('')
  const konami = useRef(0)
  const [hIndex, setHIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [lines])

  const prompt = (path: string): Line => [
    { t: 'danish@dev', cls: 'accent' },
    { t: ':' },
    { t: displayPath(path), cls: 'dir' },
    { t: ' $ ', cls: 'dim' },
  ]

  function run(cmd: string) {
    const h = useTerm.getState().handler
    if (h) {
      push([{ t: h.prompt, cls: 'dim' }, { t: h.secret ? '' : cmd }])
      setInput('')
      h.onInput(cmd.trim())
      return
    }
    const trimmed = cmd.trim()
    push([...prompt(useTerm.getState().cwd), { t: trimmed }])
    if (trimmed) addHistory(trimmed)
    setInput('')
    setHIndex(null)
    execute(trimmed, {
      cwd: useTerm.getState().cwd,
      setCwd,
      print: (...l) => push(...l),
      clear,
      exit: onExit,
    })
    inputRef.current?.focus()
  }

  function onKonami(key: string) {
    const want = KONAMI[konami.current]
    konami.current = key.toLowerCase() === want.toLowerCase() ? konami.current + 1 : key === KONAMI[0] ? 1 : 0
    if (konami.current < KONAMI.length) return false
    konami.current = 0
    setInput('')
    useTerm.getState().setSkin('rainbow')
    push([txt('↑↑↓↓←→←→BA  +30 lives. Rainbow skin unlocked: ', 'bold'), { t: 'skin', cls: 'accent', run: 'skin' }])
    unlock('konami')
    return true
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (onKonami(e.key)) return e.preventDefault()
    if (e.key === 'Enter') return run(input)
    if (e.key === 'c' && e.ctrlKey && !window.getSelection()?.toString()) {
      e.preventDefault()
      const h = useTerm.getState().handler
      if (h?.trap) return push([txt(h.trap, 'dim')])
      push([...(h ? [{ t: h.prompt, cls: 'dim' as const }] : prompt(cwd)), { t: input + '^C' }])
      setInput('')
      return capture(null)
    }
    if (handler && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab')) return e.preventDefault()
    if (e.key === 'Tab') {
      e.preventDefault()
      return setInput(complete(input, cwd))
    }
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault()
      const i = hIndex === null ? history.length - 1 : Math.max(0, hIndex - 1)
      setHIndex(i)
      setInput(history[i])
    }
    if (e.key === 'ArrowDown' && hIndex !== null) {
      e.preventDefault()
      const i = hIndex + 1
      if (i >= history.length) {
        setHIndex(null)
        setInput('')
      } else {
        setHIndex(i)
        setInput(history[i])
      }
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      clear()
    }
  }

  function segClick(s: Seg) {
    if (s.run) return run(s.run)
    if (s.open) {
      const node = getNode(s.open)
      if (node) openNode(node)
    }
  }

  function quitProgram(...l: Line[]) {
    launch(null)
    if (l.length) push(...l)
    setTimeout(() => inputRef.current?.focus())
  }

  return (
    <div className={`term skin-${skin}`} onClick={(e) => (e.target as HTMLElement).closest('button, a, .term-program') || inputRef.current?.focus()}>
      <div className="term-scroll" role="log" aria-live="polite">
        {lines.map((line, i) => (
          <div className="term-line" key={i}>
            {line.map((s, j) =>
              s.href ? (
                <a key={j} className={`seg ${s.cls ?? ''}`} href={s.href} target="_blank" rel="noreferrer">
                  {s.t}
                </a>
              ) : s.open || s.run ? (
                <button key={j} type="button" className={`seg link ${s.cls ?? ''}`} onClick={() => segClick(s)}>
                  {s.t}
                </button>
              ) : (
                <span key={j} className={`seg ${s.cls ?? ''}`} style={s.color ? { color: s.color } : undefined}>
                  {s.t}
                </span>
              ),
            )}
          </div>
        ))}
        <div className="term-line term-input-line" ref={endRef}>
          {(handler ? [{ t: handler.prompt, cls: 'dim' as const }] : prompt(cwd)).map((s, j) => (
            <span key={j} className={`seg ${s.cls ?? ''}`}>
              {s.t}
            </span>
          ))}
          <input
            ref={inputRef}
            className="term-input"
            value={input}
            type={handler?.secret ? 'password' : 'text'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Terminal command"
          />
        </div>
      </div>
      {program && (
        <Suspense fallback={null}>
          {program === 'snake' ? <Snake onQuit={quitProgram} /> : <Matrix onQuit={quitProgram} />}
        </Suspense>
      )}
      {showShortcuts && !program && (
        <div className="term-shortcuts">
          {SHORTCUTS.map((s) => (
            <button key={s} type="button" onClick={() => run(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
