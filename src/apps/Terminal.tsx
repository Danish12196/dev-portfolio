import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { create } from 'zustand'
import { displayPath, getNode } from '../fs'
import { openNode } from '../shell/opener'
import { complete, execute, WELCOME, type Line, type Seg } from '../terminal/commands'

interface TermState {
  lines: Line[]
  cwd: string
  history: string[]
  push: (...l: Line[]) => void
  clear: () => void
  setCwd: (p: string) => void
  addHistory: (cmd: string) => void
}

// Lives outside the window so closing and reopening the terminal keeps its scrollback.
export const useTerm = create<TermState>()((set) => ({
  lines: WELCOME,
  cwd: '/',
  history: [],
  push: (...l) => set((s) => ({ lines: [...s.lines, ...l].slice(-500) })),
  clear: () => set({ lines: [] }),
  setCwd: (cwd) => set({ cwd }),
  addHistory: (cmd) => set((s) => ({ history: [...s.history, cmd].slice(-100) })),
}))

const SHORTCUTS = ['help', 'projects', 'ls', 'cd ..', 'open fuloos', 'play jeopardy', 'exit']

export default function Terminal({ onExit, showShortcuts = false }: { onExit: () => void; showShortcuts?: boolean }) {
  const { lines, cwd, history, push, clear, setCwd, addHistory } = useTerm()
  const [input, setInput] = useState('')
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

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') return run(input)
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

  return (
    <div className="term" onClick={(e) => (e.target as HTMLElement).closest('button, a') || inputRef.current?.focus()}>
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
                <span key={j} className={`seg ${s.cls ?? ''}`}>
                  {s.t}
                </span>
              ),
            )}
          </div>
        ))}
        <div className="term-line term-input-line" ref={endRef}>
          {prompt(cwd).map((s, j) => (
            <span key={j} className={`seg ${s.cls ?? ''}`}>
              {s.t}
            </span>
          ))}
          <input
            ref={inputRef}
            className="term-input"
            value={input}
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
      {showShortcuts && (
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
