import { runSeed, useAchievements } from '.'
import { Star } from './Notepad'

/** The star hidden in the wallpaper sky. Its spot changes every run. */
export function SkyStar() {
  useAchievements((s) => s.runId)
  const x = 28 + runSeed('sky-x') * 60
  const y = 6 + runSeed('sky-y') * 26
  return <Star id="star-sky" className="star-sky" style={{ left: `${x}%`, top: `${y}%` }} />
}
