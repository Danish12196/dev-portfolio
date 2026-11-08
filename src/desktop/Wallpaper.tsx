/** The Soft Paper wallpaper: sun, clouds, rolling hills and two little trees. */
export default function Wallpaper({ compact = false }: { compact?: boolean }) {
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
