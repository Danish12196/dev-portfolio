import type { FsNode } from '../fs/types'
import type { OpenSpec } from '../store/windows'

/**
 * The desktop and the phone UI each register how to open a file or folder.
 * Everything else (terminal, folder views, icons) just calls openNode().
 */
type Opener = (node: FsNode) => void
type TerminalOpener = () => void
type SpecOpener = (spec: OpenSpec) => void

let opener: Opener = () => {}
let terminalOpener: TerminalOpener = () => {}
let specOpener: SpecOpener = () => {}

export function registerOpener(fn: Opener, terminal: TerminalOpener, spec: SpecOpener) {
  opener = fn
  terminalOpener = terminal
  specOpener = spec
}

export function openNode(node: FsNode) {
  if (node.type === 'file' && node.kind === 'link' && node.url) {
    window.open(node.url, '_blank', 'noopener,noreferrer')
    return
  }
  opener(node)
}

export function openTerminal() {
  terminalOpener()
}

export const UPDATES: OpenSpec = { kind: 'updates', title: 'System Updates' }

export function openUpdates() {
  specOpener(UPDATES)
}

export const SOURCE_URL = 'https://github.com/Danish12196/dev-portfolio'

export function viewSource() {
  window.open(SOURCE_URL, '_blank', 'noopener,noreferrer')
}

/** The wallpaper picker registers itself here, so the desktop menu can open it once it exists. */
let wallpaperPicker: (() => void) | undefined

export function registerWallpaperPicker(fn: (() => void) | undefined) {
  wallpaperPicker = fn
}

export function hasWallpaperPicker() {
  return Boolean(wallpaperPicker)
}

export function openWallpaperPicker() {
  wallpaperPicker?.()
}

export const STATS: OpenSpec = { kind: 'stats', title: 'Stats' }

/** Windows that aren't a file, like Stats. */
export function openStats() {
  specOpener(STATS)
}

export const GUESTBOOK: OpenSpec = { kind: 'guestbook', title: 'Guestbook' }

export function openGuestbook() {
  specOpener(GUESTBOOK)
}

/** The wallpaper settings window. */
export const WALLPAPER_SPEC: OpenSpec = { kind: 'wallpaper', title: 'Wallpaper' }
