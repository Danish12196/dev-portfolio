import { useTheme } from '../shell/theme'
import { setWallpaper, thumbFor, useWallpaper, WALLPAPERS, type WallpaperDef } from '../shell/wallpaper'

function Credits({ wp }: { wp: WallpaperDef }) {
  return (
    <ul className="wpp-credit">
      {wp.credits.map((c) => (
        <li key={c.role + c.by}>
          <span className="wpp-role">{c.role}</span>{' '}
          <a href={c.href} target="_blank" rel="noreferrer">
            {c.by}
          </a>
          {' · '}
          <a href={c.licenseHref} target="_blank" rel="noreferrer">
            {c.license}
          </a>
        </li>
      ))}
      {wp.via && (
        <li>
          <span className="wpp-role">Via</span>{' '}
          <a href={wp.via.href} target="_blank" rel="noreferrer">
            {wp.via.name}
          </a>
        </li>
      )}
    </ul>
  )
}

/** Settings window for the desktop background. Every option has a day and a night version. */
export default function WallpaperPicker() {
  const current = useWallpaper()
  const [theme, setTheme] = useTheme()
  return (
    <div className="wpp">
      <div className="wpp-top">
        <p>Every wallpaper has a day and a night version, and follows the theme.</p>
        <div className="wpp-theme" role="group" aria-label="Theme">
          {(['light', 'dark'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>
              {t === 'light' ? '☀ Day' : '☾ Night'}
            </button>
          ))}
        </div>
      </div>
      <div className="wpp-grid" role="radiogroup" aria-label="Wallpaper">
        {WALLPAPERS.map((w) => (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={w.id === current.id}
            className="wpp-option"
            onClick={() => setWallpaper(w.id)}
          >
            <span className="wpp-thumb" aria-hidden="true">
              <img src={thumbFor(w.id, 'light')} alt="" loading="lazy" />
              <img src={thumbFor(w.id, 'dark')} alt="" loading="lazy" className="wpp-night" />
            </span>
            <span className="wpp-name">{w.name}</span>
          </button>
        ))}
      </div>
      <section className="wpp-about" aria-label={`Credits for ${current.name}`}>
        <h2>{current.name}</h2>
        <Credits wp={current} />
      </section>
      <details className="wpp-all">
        <summary>All wallpaper credits</summary>
        {WALLPAPERS.filter((w) => w.id !== 'hills').map((w) => (
          <div key={w.id}>
            <h3>{w.name}</h3>
            <Credits wp={w} />
          </div>
        ))}
        <p className="wpp-note">Images were resized and converted to WebP. The CC BY-SA ones stay under their original licence.</p>
      </details>
    </div>
  )
}
