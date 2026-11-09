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

export const STATS: OpenSpec = { kind: 'stats', title: 'Stats' }

/** Windows that aren't a file, like Stats. */
export function openStats() {
  specOpener(STATS)
}
