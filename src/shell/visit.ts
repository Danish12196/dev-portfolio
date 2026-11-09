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

  const flush = () => {
    if (visibleSince) {
      pending += performance.now() - visibleSince
      visibleSince = 0
    }
    const s = Math.round(pending / 1000)
    if (!first && s < 1) return
    const sent = navigator.sendBeacon?.('/api/visit', JSON.stringify(first ? { s, n: 1 } : { s }))
    if (sent) {
      pending -= s * 1000
      first = false
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
    else visibleSince = performance.now()
  })
  window.addEventListener('pagehide', flush)
}
