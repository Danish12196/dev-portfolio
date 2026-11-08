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
