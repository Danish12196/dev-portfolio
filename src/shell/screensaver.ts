/** How long the desktop sits untouched before the screensaver starts. */
export const IDLE_MS = 30_000

const listeners = new Set<() => void>()

/** The desktop's screensaver listens here. */
export function onScreensaverRequest(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

/** Start the screensaver now (the terminal's `screensaver` command). Returns false on the phone, which has none. */
export function startScreensaver() {
  listeners.forEach((l) => l())
  return listeners.size > 0
}
