/** Focus the window on top, or the first desktop icon when none is left open. */
export function focusTopWindow() {
  const wins = [...document.querySelectorAll<HTMLElement>('.win:not([hidden])')]
  const top = wins.sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0]
  ;(top ?? document.querySelector<HTMLElement>('.desk-icon'))?.focus({ preventScroll: true })
}
