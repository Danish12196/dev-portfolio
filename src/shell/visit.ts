/**
 * Tells /api/visit how long this tab was visible, so the Stats window can show
 * total visits and the average time spent. Nothing identifies the visitor: no
 * cookies, no storage, no IDs, just a number of seconds. Browsers that send
 * Global Privacy Control or Do Not Track are left out entirely.
 */
export function startVisitClock() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  if (import.meta.env.DEV || nav.webdriver || nav.globalPrivacyControl || nav.doNotTrack === '1') return

  let visibleSince = document.visibilityState === 'visible' ? performance.now() : 0
  let pending = 0
  let first = true
  // The server caps each beacon too, but one page load should never add more than this in total.
  let allowance = 30 * 60

  const flush = () => {
    if (visibleSince) {
      pending += performance.now() - visibleSince
      visibleSince = 0
    }
    const s = Math.min(allowance, Math.round(pending / 1000))
    if (!first && s < 1) return
    const sent = navigator.sendBeacon?.('/api/visit', JSON.stringify(first ? { s, n: 1 } : { s }))
    if (sent) {
      pending = allowance > s ? pending - s * 1000 : 0
      allowance -= s
      first = false
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
    else visibleSince = performance.now()
  })
  window.addEventListener('pagehide', flush)
}
