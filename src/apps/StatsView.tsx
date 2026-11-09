import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { projects } from '../fs'
import { ago, duration, LANG_COLORS, level, loadStats, loadVisits, weeks, type Contributions, type Stats, type Visits } from './stats'

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

/** A label ........ value row, like a system monitor readout. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="st-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="st-section">
      <h2>
        {title}
        {note && <span className="st-note">{note}</span>}
      </h2>
      {children}
    </section>
  )
}

function Heatmap({ c }: { c: Contributions }) {
  const cols = weeks(c.days)
  const max = Math.max(...c.days.map((d) => d.count))
  const fmt = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return (
    <div className="st-heat-scroll">
      <div className="st-heat" role="img" aria-label={`${c.total} contributions in the last year`}>
        {cols.map((week, i) => (
          <div className="st-week" key={i}>
            {week.map((d, j) =>
              d ? (
                <span key={j} className={`st-cell l${c.exact ? level(d.count, max) : Math.min(4, d.count)}`} title={c.exact ? `${d.count} on ${fmt(d.date)}` : fmt(d.date)} />
              ) : (
                <span key={j} className="st-cell st-empty" />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Languages({ langs }: { langs: { name: string; share: number }[] }) {
  return (
    <>
      <div className="st-bar" role="img" aria-label={langs.map((l) => `${l.name} ${Math.round(l.share * 100)}%`).join(', ')}>
        {langs.map((l, i) => (
          <span key={l.name} style={{ flexGrow: l.share, background: LANG_COLORS[i % LANG_COLORS.length] }} />
        ))}
      </div>
      <ul className="st-legend">
        {langs.map((l, i) => (
          <li key={l.name}>
            <span className="st-dot" style={{ background: LANG_COLORS[i % LANG_COLORS.length] }} />
            {l.name}
            <span className="st-pct">{l.share < 0.01 ? '<1' : Math.round(l.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function StatsView() {
  const [stats, setStats] = useState<Stats | null | undefined>()
  const [visits, setVisits] = useState<Visits | null | undefined>()
  useEffect(() => {
    loadStats().then(setStats)
    loadVisits().then(setVisits)
  }, [])

  if (stats === undefined) return <div className="stats st-loading">reading counters…</div>

  const gh = stats?.github
  const c = gh?.contributions
  const fav = c && c.total ? c.weekday.indexOf(Math.max(...c.weekday)) : -1
  const games = stats?.itch
  const maxViews = games ? Math.max(...games.map((g) => g.views), 1) : 1

  return (
    <div className="stats">
      <p className="st-prompt">
        <span>danish@dev</span> ~ $ stats{' '}
        {stats && <span className="st-note">refreshed {ago(stats.builtAt)}, on every deploy</span>}
      </p>

      {c ? (
        <Section title="Contributions" note={c.exact ? `${c.total.toLocaleString()} in the last year` : 'the last year'}>
          <Heatmap c={c} />
          <dl className="st-rows">
            <Row label="current streak">{c.currentStreak ? `${c.currentStreak} day${c.currentStreak === 1 ? '' : 's'}` : 'resting'}</Row>
            <Row label="longest streak">{c.longestStreak} days</Row>
            <Row label="days with commits">{c.activeDays} of {Math.min(365, c.days.length)}</Row>
            {c.exact && c.busiestDay && (
              <Row label="busiest day">
                {c.busiestDay.count} on {new Date(`${c.busiestDay.date}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' })}
              </Row>
            )}
            {fav >= 0 && <Row label="most active on">{WEEKDAYS[fav]}</Row>}
          </dl>
        </Section>
      ) : null}

      {gh?.languages?.length ? (
        <Section title="Languages" note="by bytes across my public repos, notebooks left out">
          <Languages langs={gh.languages} />
        </Section>
      ) : null}

      {gh?.commits?.length ? (
        <Section title="Recent commits">
          <ol className="st-log">
            {gh.commits.map((cm) => (
              <li key={cm.sha + cm.repo}>
                <a href={cm.url} target="_blank" rel="noreferrer">
                  <span className="st-sha">{cm.sha}</span>
                  <span className="st-repo">{cm.repo}</span>
                  <span className="st-msg">{cm.message}</span>
                  <time dateTime={cm.date}>{ago(cm.date)}</time>
                </a>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {games?.length ? (
        <Section title="Games on itch.io" note="views">
          <ul className="st-games">
            {games.map((g) => (
              <li key={g.url}>
                <a href={g.url} target="_blank" rel="noreferrer">
                  {g.title}
                </a>
                <span className="st-meter" style={{ ['--w' as string]: `${(g.views / maxViews) * 100}%` } as CSSProperties} />
                <span className="st-num">{g.views.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="This site">
        <dl className="st-rows">
          {visits && visits.visits > 0 && (
            <>
              <Row label="visits">
                {visits.visits.toLocaleString()}
                {visits.since && <span className="st-note"> since {new Date(visits.since).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </Row>
              <Row label="average time here">{duration(visits.avgSeconds)}</Row>
            </>
          )}
          <Row label="projects">{projects().length}</Row>
          {stats?.site.files ? <Row label="files on this disk">{stats.site.files}</Row> : null}
          {stats?.site.commits ? <Row label="commits to build it">{stats.site.commits}</Row> : null}
          {gh?.profile && (
            <>
              <Row label="public repos">{gh.profile.publicRepos}</Row>
              <Row label="on GitHub since">{new Date(gh.profile.since).getFullYear()}</Row>
            </>
          )}
        </dl>
        {visits && visits.visits > 0 && <p className="st-fine">Visits are counted without cookies or IDs: each visit only sends how long the tab was open.</p>}
      </Section>

      {!c && !gh?.commits?.length && <p className="st-fine">GitHub couldn&apos;t be reached when this version was built, so its numbers will be back after the next deploy.</p>}
    </div>
  )
}
