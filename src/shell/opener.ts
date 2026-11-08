import type { FsNode } from '../fs/types'

/**
 * The desktop and the phone UI each register how to open a file or folder.
 * Everything else (terminal, folder views, icons) just calls openNode().
 */
type Opener = (node: FsNode) => void
type TerminalOpener = () => void

let opener: Opener = () => {}
let terminalOpener: TerminalOpener = () => {}

export function registerOpener(fn: Opener, terminal: TerminalOpener) {
  opener = fn
  terminalOpener = terminal
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
