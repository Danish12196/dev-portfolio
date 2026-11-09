// Creates the two PocketBase collections behind the visit counter in the
// Stats window. It only adds "site_visits" and "site_visit_totals"; nothing
// else on the server changes.
//
//   macOS/Linux:  PB_EMAIL=you@example.com PB_PASSWORD=... node scripts/setup-visits.mjs
//   Windows cmd:  set "PB_EMAIL=you@example.com" && set "PB_PASSWORD=..." && node scripts/setup-visits.mjs
//
// PB_URL defaults to https://pb.danishali.dev. The script prints a VISITS_KEY:
// add it to the Vercel project's environment variables, then redeploy.
//
// Run it again with --new-key to replace the key; that only rewrites the
// rules of these two collections.
import { randomBytes } from 'node:crypto'

const PB = (process.env.PB_URL || 'https://pb.danishali.dev').replace(/\/+$/, '')
const { PB_EMAIL, PB_PASSWORD } = process.env
const newKey = process.argv.includes('--new-key')

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Set PB_EMAIL and PB_PASSWORD (a PocketBase superuser) first. See the top of this file.')
  process.exit(1)
}

async function call(path, init = {}, token) {
  const res = await fetch(`${PB}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

function fail(what, res) {
  console.error(`Could not ${what} (${res.status}):`, JSON.stringify(res.body, null, 2))
  process.exit(1)
}

const auth = await call('/api/collections/_superusers/auth-with-password', {
  method: 'POST',
  body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
})
if (!auth.ok || !auth.body.token) {
  console.error(`Could not sign in to ${PB} as a superuser (${auth.status}). This script needs PocketBase 0.23 or newer.`)
  console.error(auth.body.message ?? '')
  process.exit(1)
}
const token = auth.body.token

const key = randomBytes(24).toString('base64url')
const hasKey = `@request.headers.x_visits_key = "${key}"`
// Only the site's function, which sends the key, can read or write; rows are deleted in the admin UI.
const rowRules = { listRule: hasKey, viewRule: hasKey, createRule: hasKey, updateRule: hasKey, deleteRule: null }
const totalRules = { listRule: hasKey, viewRule: hasKey }

const rows = await call('/api/collections/site_visits', {}, token)
const totals = await call('/api/collections/site_visit_totals', {}, token)

if (rows.ok && totals.ok && !newKey) {
  console.log('The visit collections already exist, so nothing was changed.')
  console.log('Run with --new-key to replace their key.')
  process.exit(0)
}

if (rows.ok) {
  if (newKey) {
    const res = await call('/api/collections/site_visits', { method: 'PATCH', body: JSON.stringify(rowRules) }, token)
    if (!res.ok) fail('update site_visits', res)
  }
} else {
  const res = await call(
    '/api/collections',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'site_visits',
        type: 'base',
        ...rowRules,
        fields: [
          // Seconds the tab was visible during one page load, capped at 30 minutes.
          { name: 'seconds', type: 'number', min: 0, max: 1800, onlyInt: true },
          // IP hashed with a salt that changes daily, used only for rate limiting.
          { name: 'visitor', type: 'text', max: 64 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX `idx_site_visits_created` ON `site_visits` (`created`)'],
      }),
    },
    token,
  )
  if (!res.ok) fail('create site_visits', res)
}

if (totals.ok) {
  if (newKey) {
    const res = await call('/api/collections/site_visit_totals', { method: 'PATCH', body: JSON.stringify(totalRules) }, token)
    if (!res.ok) fail('update site_visit_totals', res)
  }
} else {
  const res = await call(
    '/api/collections',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'site_visit_totals',
        type: 'view',
        ...totalRules,
        viewQuery:
          'SELECT (ROW_NUMBER() OVER()) AS id, COUNT(*) AS visits, COALESCE(SUM(seconds), 0) AS seconds, MIN(created) AS since FROM site_visits',
      }),
    },
    token,
  )
  if (!res.ok) fail('create site_visit_totals', res)
}

if (!newKey && (rows.ok || totals.ok)) {
  console.log('Note: one of the collections already existed with its own key, so run this again with --new-key')
  console.log('to give both the key below.')
}

console.log(`Done. The visit counter is ready on ${PB}.`)
console.log('')
console.log('Add this to Vercel (Project > Settings > Environment Variables), then redeploy:')
console.log('')
console.log(`  VISITS_KEY=${key}`)
console.log('')
console.log(`Visits show up in ${PB}/_/ under "site_visits"; the Stats window reads "site_visit_totals".`)
