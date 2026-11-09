/**
 * Tells /api/visit how long this tab was visible, so the Stats window can show
 * total visits and the average time spent. Nothing is stored in the browser:
 * the page picks a random id for this page load, keeps it in memory so later
 * reports add to the same visit, and forgets it on reload. Browsers that send
 * Global Privacy Control or Do Not Track are left out entirely.
 */

function pageLoadId() {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return [...crypto.getRandomValues(new Uint8Array(15))].map((b) => abc[b % abc.length]).join('')
}

export function startVisitClock() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  if (import.meta.env.DEV || nav.webdriver || nav.globalPrivacyControl || nav.doNotTrack === '1') return

  let visibleSince = document.visibilityState === 'visible' ? performance.now() : 0
  let pending = 0
  const id = pageLoadId()
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
    const sent = navigator.sendBeacon?.('/api/visit', JSON.stringify(first ? { id, s, n: 1 } : { id, s }))
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
