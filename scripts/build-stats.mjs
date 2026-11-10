// Collects the numbers for the Stats window and the `stats` command and writes
// them to public/stats.json, which the site loads only when someone asks.
//
// Everything is fetched once per deploy, so visitors never hit GitHub or itch.io
// and no rate limit can be reached from the browser. If a source can't be
// reached during a build, the numbers from the live site's current stats.json
// are kept instead, so a flaky build never blanks the window.
//
// Optional environment variables (set them in Vercel):
//   GITHUB_TOKEN   any token with no scopes; gives exact contribution counts
//                  and a much higher rate limit than anonymous requests
//   ITCH_API_KEY   an itch.io API key (itch.io > Settings > API keys) for views
//                  and downloads of the games on danish-gamedev.itch.io
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = new URL('..', import.meta.url).pathname
const OUT = join(ROOT, 'public/stats.json')
const USER = 'danishali-codes'
const SITE_REPO = 'danishali-codes/dev-portfolio'
const LIVE = 'https://danishali.dev/stats.json'

const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'dev-portfolio-build',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: GITHUB_HEADERS, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`GitHub ${path} ${res.status}`)
  return res
}

/* ---------- contributions ---------- */

/** Contribution days from the GraphQL API; needs a token. */
async function contributionsGraphql() {
  const query = `query { user(login: "${USER}") { contributionsCollection { contributionCalendar {
    weeks { contributionDays { date contributionCount } } } } } }`
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...GITHUB_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`)
  const { data, errors } = await res.json()
  if (errors?.length) throw new Error(`GitHub GraphQL: ${errors[0].message}`)
  return data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }))
}

/**
 * Contribution days read from the public calendar on github.com, for builds
 * without a token. Each day is a <td data-date data-level id> cell, and its
 * count is in a <tool-tip for="<id>"> like "3 contributions on May 2nd.".
 */
export function parseContributionsHtml(html) {
  const tips = new Map()
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = m[2].match(/^\s*(\d[\d,]*|No) contributions?/i)
    if (n) tips.set(m[1], n[1].toLowerCase() === 'no' ? 0 : Number(n[1].replace(/,/g, '')))
  }
  const days = []
  for (const m of html.matchAll(/<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const tag = m[0]
    const id = tag.match(/\bid="([^"]+)"/)?.[1]
    const level = Number(tag.match(/\bdata-level="(\d)"/)?.[1] ?? 0)
    const count = id && tips.has(id) ? tips.get(id) : level
    days.push({ date: m[1], count })
  }
  return days.sort((a, b) => a.date.localeCompare(b.date))
}

async function contributionsHtml() {
  const res = await fetch(`https://github.com/users/${USER}/contributions`, {
    headers: { 'User-Agent': 'dev-portfolio-build' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`github.com contributions ${res.status}`)
  const days = parseContributionsHtml(await res.text())
  if (days.length < 300) throw new Error(`github.com contributions: only ${days.length} days found`)
  return days
}

/** Totals and streaks for a list of { date, count } days, oldest first. */
export function summarise(days, today = new Date().toISOString().slice(0, 10)) {
  const past = days.filter((d) => d.date <= today)
  let longest = 0
  let run = 0
  for (const d of past) {
    run = d.count > 0 ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  // Today not having a commit yet doesn't break the streak.
  let current = 0
  for (let i = past.length - 1; i >= 0; i--) {
    if (past[i].count > 0) current++
    else if (i === past.length - 1 && past[i].date === today) continue
    else break
  }
  const busiest = past.reduce((best, d) => (d.count > (best?.count ?? 0) ? d : best), undefined)
  const weekday = Array(7).fill(0)
  for (const d of past) weekday[new Date(`${d.date}T00:00:00Z`).getUTCDay()] += d.count
  return {
    total: past.reduce((n, d) => n + d.count, 0),
    activeDays: past.filter((d) => d.count > 0).length,
    currentStreak: current,
    longestStreak: longest,
    busiestDay: busiest ? { date: busiest.date, count: busiest.count } : null,
    /** contributions per weekday, Sunday first */
    weekday,
  }
}

async function contributions() {
  let days
  let exact = true
  if (process.env.GITHUB_TOKEN) {
    try {
      days = await contributionsGraphql()
    } catch (err) {
      console.warn(`stats: ${err.message}, trying the public calendar`)
    }
  }
  if (!days) {
    days = await contributionsHtml()
    exact = days.some((d) => d.count > 4)
  }
  return { days: days.slice(-371), exact, ...summarise(days) }
}

/* ---------- repos, languages, recent commits ---------- */

async function repos() {
  const res = await gh(`/users/${USER}/repos?per_page=100&sort=pushed&type=owner`)
  const list = (await res.json()).filter((r) => !r.fork && !r.archived)
  return list
}

async function languages(list) {
  // Anonymous builds get 60 requests an hour, so only look at the busiest repos.
  const sample = list.slice(0, process.env.GITHUB_TOKEN ? 40 : 15)
  const bytes = {}
  for (const r of sample) {
    try {
      const langs = await (await gh(`/repos/${r.full_name}/languages`)).json()
      for (const [lang, n] of Object.entries(langs)) {
        // Notebooks are mostly saved plots and outputs, which would drown out every real language.
        if (lang === 'Jupyter Notebook') continue
        bytes[lang] = (bytes[lang] ?? 0) + n
      }
    } catch (err) {
      console.warn(`stats: languages for ${r.full_name} skipped (${err.message})`)
    }
  }
  const total = Object.values(bytes).reduce((a, b) => a + b, 0)
  if (!total) throw new Error('no language data')
  const sorted = Object.entries(bytes).sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, 6).map(([name, n]) => ({ name, share: n / total }))
  const rest = sorted.slice(6).reduce((n, [, b]) => n + b, 0)
  if (rest) top.push({ name: 'Other', share: rest / total })
  return top
}

async function recentCommits(list) {
  const commits = []
  let reached = 0
  for (const r of list.slice(0, 6)) {
    try {
      const items = await (await gh(`/repos/${r.full_name}/commits?per_page=5&author=${USER}`)).json()
      reached++
      for (const c of items) {
        const message = c.commit.message.split('\n')[0]
        // Merge commits say nothing a visitor cares about.
        if (/^Merge\b/.test(message)) continue
        commits.push({ repo: r.name, sha: c.sha.slice(0, 7), message: message.slice(0, 90), date: c.commit.author.date, url: c.html_url })
      }
    } catch (err) {
      console.warn(`stats: commits for ${r.full_name} skipped (${err.message})`)
    }
  }
  // Every request failing should keep the last deployed commits, not show none.
  if (!reached) throw new Error('no repo commits could be read')
  return commits.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
}

async function profile(list) {
  const user = await (await gh(`/users/${USER}`)).json()
  return {
    login: user.login,
    publicRepos: user.public_repos,
    followers: user.followers,
    since: user.created_at,
    stars: list.reduce((n, r) => n + r.stargazers_count, 0),
  }
}

/** How many commits this site's own repo has, from the last page number of a 1-per-page listing. */
async function siteCommits() {
  const res = await gh(`/repos/${SITE_REPO}/commits?per_page=1`)
  const last = res.headers.get('link')?.match(/[?&]page=(\d+)>; rel="last"/)
  if (last) return Number(last[1])
  return (await res.json()).length
}

/* ---------- itch.io ---------- */

async function itch() {
  const key = process.env.ITCH_API_KEY
  if (!key) throw new Error('ITCH_API_KEY is not set')
  const res = await fetch(`https://itch.io/api/1/${key}/my-games`, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`itch.io ${res.status}`)
  const { games, errors } = await res.json()
  if (errors?.length) throw new Error(`itch.io: ${errors.join(', ')}`)
  return games
    .filter((g) => g.published)
    .map((g) => ({ title: g.title, url: g.url, views: g.views_count ?? 0, downloads: g.downloads_count ?? 0 }))
    .sort((a, b) => b.views - a.views)
}

/* ---------- this site ---------- */

function countFiles(dir) {
  let n = 0
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const full = join(dir, name)
    n += statSync(full).isDirectory() ? countFiles(full) : 1
  }
  return n
}

/* ---------- put it together ---------- */

async function previous() {
  try {
    const res = await fetch(LIVE, { signal: AbortSignal.timeout(8_000) })
    return res.ok ? await res.json() : {}
  } catch {
    return {}
  }
}

/** Runs one source; on failure keeps what the live site had, or null. */
async function section(name, fn, old) {
  try {
    return await fn()
  } catch (err) {
    console.warn(`stats: ${name} unavailable (${err.message})${old?.[name] ? ', keeping the last deployed numbers' : ''}`)
    return old?.[name] ?? null
  }
}

export async function main() {
  const old = await previous()
  const oldGithub = old.github ?? {}
  let list = []
  try {
    list = await repos()
  } catch (err) {
    console.warn(`stats: repo list unavailable (${err.message})`)
  }
  const github = {
    profile: list.length ? await section('profile', () => profile(list), oldGithub) : (oldGithub.profile ?? null),
    contributions: await section('contributions', contributions, oldGithub),
    languages: list.length ? await section('languages', () => languages(list), oldGithub) : (oldGithub.languages ?? null),
    commits: list.length ? await section('commits', () => recentCommits(list), oldGithub) : (oldGithub.commits ?? null),
  }
  const stats = {
    builtAt: new Date().toISOString(),
    github,
    itch: await section('itch', itch, old),
    site: {
      commits: await section('commits', siteCommits, old.site),
      files: countFiles(join(ROOT, 'content')),
    },
  }
  mkdirSync(join(OUT, '..'), { recursive: true })
  writeFileSync(OUT, JSON.stringify(stats))
  const got = [
    github.contributions && `${github.contributions.total} contributions`,
    github.languages && `${github.languages.length} languages`,
    github.commits && `${github.commits.length} recent commits`,
    stats.itch && `${stats.itch.length} itch.io games`,
  ].filter(Boolean)
  console.log(`stats: ${got.length ? got.join(', ') : 'no live numbers this build'} -> public/stats.json`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
