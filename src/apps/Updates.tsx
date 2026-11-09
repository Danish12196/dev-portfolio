import changelog from '../generated/changelog.json'

interface Entry {
  n: number
  title: string
  date: string
}

const REPO = `https://github.com/${changelog.repo}`
const entries = changelog.entries as Entry[]

function day(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/** System Updates: the site's own changelog, one line per merged pull request. */
export default function Updates() {
  const latest = entries[0]
  const groups: [string, Entry[]][] = []
  for (const e of entries) {
    const d = day(e.date)
    const last = groups[groups.length - 1]
    if (last?.[0] === d) last[1].push(e)
    else groups.push([d, [e]])
  }
  return (
    <div className="updates">
      <header className="up-head">
        <span className="up-check" aria-hidden="true">
          ✓
        </span>
        <div>
          <h2>danishali.dev is up to date</h2>
          <p>
            {latest ? (
              <>
                Build {latest.n}, installed {new Date(latest.date).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </>
            ) : (
              'No update history on this build.'
            )}
          </p>
        </div>
      </header>
      <h3 className="up-label">Update history</h3>
      {groups.length === 0 && (
        <p className="up-empty">
          The changelog couldn't be fetched when this build was made. <a href={`${REPO}/pulls?q=is%3Amerged`} target="_blank" rel="noreferrer">See it on GitHub ↗</a>
        </p>
      )}
      {groups.map(([d, list]) => (
        <section key={d} className="up-day" aria-label={d}>
          <h4>{d}</h4>
          <ul>
            {list.map((e) => (
              <li key={e.n}>
                <span className="up-title">{e.title}</span>
                <a className="up-build" href={`${REPO}/pull/${e.n}`} target="_blank" rel="noreferrer" aria-label={`Build ${e.n} on GitHub`}>
                  #{e.n}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <a className="pill up-source" href={REPO} target="_blank" rel="noreferrer">
        View source ↗
      </a>
    </div>
  )
}
