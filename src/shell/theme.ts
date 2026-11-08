import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'devportfolio.theme'
const listeners = new Set<(t: Theme) => void>()

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* storage blocked */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

let current: Theme = initial()
document.documentElement.dataset.theme = current

export function setTheme(t: Theme) {
  current = t
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* storage blocked */
  }
  listeners.forEach((l) => l(t))
}

export function getTheme() {
  return current
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [t, set] = useState(current)
  useEffect(() => {
    listeners.add(set)
    return () => void listeners.delete(set)
  }, [])
  return [t, setTheme]
}
