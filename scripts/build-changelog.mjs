// Writes src/generated/changelog.json for the System Updates app: every merged
// pull request on this repo, newest first. It asks the GitHub API (public, no
// token needed) and falls back to the local git history when that fails, for
// example offline or when the API rate limit is hit.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const OUT = join(ROOT, 'src/generated/changelog.json')
const REPO = 'danishali-codes/dev-portfolio'

async function fromGitHub() {
  const entries = []
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`https://api.github.com/repos/${REPO}/pulls?state=closed&per_page=100&page=${page}`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'danishali.dev-build' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const prs = await res.json()
    for (const pr of prs) if (pr.merged_at) entries.push({ n: pr.number, title: pr.title.trim(), date: pr.merged_at })
    if (prs.length < 100) break
  }
  return entries
}

function fromGit() {
  const log = execFileSync('git', ['log', '--first-parent', '--format=%cI%x09%s'], { cwd: ROOT, encoding: 'utf8' })
  const entries = []
  for (const line of log.trim().split('\n')) {
    const [date, subject = ''] = line.split('\t')
    const merge = subject.match(/^Merge pull request #(\d+)(?::\s*(.+)| from (\S+))/)
    const squash = subject.match(/^(.+?) \(#(\d+)\)$/)
    if (merge) entries.push({ n: Number(merge[1]), title: merge[2] ?? merge[3].replace(/^[^/]+\//, '').replace(/[-/]/g, ' '), date })
    else if (squash) entries.push({ n: Number(squash[2]), title: squash[1], date })
  }
  return entries
}

let entries
let source = 'github'
try {
  entries = await fromGitHub()
} catch (e) {
  source = 'git'
  try {
    entries = fromGit()
  } catch {
    entries = []
  }
  console.warn(`changelog: GitHub API unavailable (${e.message}), using ${entries.length ? 'git history' : 'nothing'}`)
}

for (const e of entries) e.date = new Date(e.date).toISOString()
entries.sort((a, b) => b.date.localeCompare(a.date))
mkdirSync(join(OUT, '..'), { recursive: true })
writeFileSync(OUT, JSON.stringify({ source, repo: REPO, entries }, null, 2))
console.log(`changelog: ${entries.length} updates from ${source} -> src/generated/changelog.json`)
