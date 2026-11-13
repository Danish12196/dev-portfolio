import { projects } from '../fs'

export interface Seg {
  t: string
  cls?: 'dim' | 'accent' | 'err' | 'dir' | 'bold'
  /** Any CSS colour, for things like the neofetch colour blocks. */
  color?: string
  /** Clicking opens this file system path. */
  open?: string
  /** Clicking runs this command. */
  run?: string
  href?: string
}
export type Line = Seg[]

export const txt = (t: string, cls?: Seg['cls']): Seg => ({ t, cls })
export const err = (t: string): Line => [txt(t, 'err')]
export const cmd = (name: string, run = name): Seg => ({ t: name, cls: 'accent', run })

export const WELCOME: Line[] = [
  [txt('Dev portfolio', 'bold'), txt(` · ${projects().length} projects in `, 'dim'), { t: '~/projects', cls: 'dir', open: '/projects' }],
  [txt('Type ', 'dim'), cmd('help'), txt(' to look around, ', 'dim'), cmd('projects'), txt(' for the list, or ', 'dim'), cmd('exit'), txt(' for the desktop.', 'dim')],
]
