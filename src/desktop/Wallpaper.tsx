import { useEffect } from 'react'
import { useTheme } from '../shell/theme'
import { useWallpaper } from '../shell/wallpaper'

/** The Soft Paper wallpaper: sun, clouds, rolling hills and two little trees. */
function Hills({ compact }: { compact: boolean }) {
  return (
    <div className={`wallpaper${compact ? ' compact' : ''}`} aria-hidden="true">
      <span className="wp-sun" />
      <span className="wp-cloud c1" />
      <span className="wp-cloud c1b" />
      <span className="wp-cloud c2" />
      <span className="wp-hill h1" />
      <span className="wp-hill h2" />
      <span className="wp-hill h3" />
      <span className="wp-trunk k1" />
      <span className="wp-tree t1" />
      <span className="wp-trunk k2" />
      <span className="wp-tree t2" />
    </div>
  )
}

/** The wallpaper the visitor picked, in the version that matches the current theme. */
export default function Wallpaper({ compact = false }: { compact?: boolean }) {
  const wp = useWallpaper()
  const [theme] = useTheme()
  const src = wp.files?.[theme]
  const other = wp.files?.[theme === 'dark' ? 'light' : 'dark']

  // Fetch the other version once things are quiet, so flipping the theme doesn't flash.
  useEffect(() => {
    if (!other) return
    const t = setTimeout(() => (new Image().src = other), 4000)
    return () => clearTimeout(t)
  }, [other])

  if (!src) return <Hills compact={compact} />
  return (
    <div className={`wallpaper wallpaper-img${compact ? ' compact' : ''}`} aria-hidden="true">
      <div key={src} className="wp-img" style={{ backgroundImage: `url(${src})` }} />
    </div>
  )
}
