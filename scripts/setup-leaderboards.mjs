// Creates the PocketBase collections for the snake and achievements
// leaderboards: lb_scores, lb_spent and lb_hits. Nothing else on the server changes.
//
//   macOS/Linux:  PB_EMAIL=you@example.com PB_PASSWORD=... node scripts/setup-leaderboards.mjs
//   Windows cmd:  set "PB_EMAIL=you@example.com" && set "PB_PASSWORD=..." && node scripts/setup-leaderboards.mjs
//
// PB_URL defaults to https://pb.danishali.dev. The script prints a LEADERBOARD_KEY:
// add it to the Vercel project's environment variables, then redeploy.
//
// Run it again with --new-key to replace the key (for example if it leaked);
// that only rewrites these collections' rules. Games in progress then can't be
// submitted, since the key also signs game tokens.
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
const hasKey = `@request.headers.x_leaderboard_key = "${key}"`
const created = { name: 'created', type: 'autodate', onCreate: true, onUpdate: false }
const updated = { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }

// Only the site's function, which sends the key, can touch these.
const COLLECTIONS = [
  {
    name: 'lb_scores',
    rules: { listRule: hasKey, viewRule: hasKey, createRule: hasKey, updateRule: hasKey, deleteRule: null },
    fields: [
      { name: 'board', type: 'text', required: true, max: 20 },
      { name: 'name', type: 'text', required: true, max: 16 },
      { name: 'name_key', type: 'text', required: true, max: 16 },
      // Snake score, or milliseconds to find every achievement.
      { name: 'value', type: 'number', required: true, onlyInt: true },
      // When the entry was set, in ms; breaks ties in favour of whoever got there first.
      { name: 'at', type: 'number', required: true, onlyInt: true },
      created,
      updated,
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_lb_scores_name` ON `lb_scores` (`board`, `name_key`)',
      'CREATE INDEX `idx_lb_scores_rank` ON `lb_scores` (`board`, `value`)',
    ],
  },
  {
    name: 'lb_spent',
    rules: { listRule: null, viewRule: hasKey, createRule: hasKey, updateRule: null, deleteRule: null },
    fields: [{ name: 'token', type: 'text', required: true, max: 64 }, created],
    indexes: ['CREATE UNIQUE INDEX `idx_lb_spent_token` ON `lb_spent` (`token`)'],
  },
  {
    name: 'lb_hits',
    rules: { listRule: hasKey, viewRule: hasKey, createRule: hasKey, updateRule: null, deleteRule: hasKey },
    fields: [
      { name: 'bucket', type: 'text', required: true, max: 20 },
      // Salted hash of the visitor's IP, used only for rate limiting.
      { name: 'visitor', type: 'text', required: true, max: 64 },
      created,
    ],
    indexes: ['CREATE INDEX `idx_lb_hits` ON `lb_hits` (`bucket`, `visitor`, `created`)'],
  },
]

const exists = {}
for (const c of COLLECTIONS) exists[c.name] = (await call(`/api/collections/${c.name}`, {}, token)).ok
if (COLLECTIONS.every((c) => exists[c.name]) && !newKey) {
  console.log('The leaderboard collections already exist, so nothing was changed.')
  console.log('Run with --new-key to replace their key.')
  process.exit(0)
}

// Every collection gets the new key, including any left over from an earlier half-finished run.
for (const c of COLLECTIONS) {
  const res = exists[c.name]
    ? await call(`/api/collections/${c.name}`, { method: 'PATCH', body: JSON.stringify(c.rules) }, token)
    : await call(
        '/api/collections',
        { method: 'POST', body: JSON.stringify({ name: c.name, type: 'base', ...c.rules, fields: c.fields, indexes: c.indexes }) },
        token,
      )
  if (!res.ok) {
    console.error(`Could not set up ${c.name} (${res.status}):`, JSON.stringify(res.body, null, 2))
    process.exit(1)
  }
  console.log(`${exists[c.name] ? 'Updated' : 'Created'} ${c.name}.`)
}

console.log(`Done. The leaderboards are ready on ${PB}.`)
console.log('')
console.log('Add this to Vercel (Project > Settings > Environment Variables), then redeploy:')
console.log('')
console.log(`  LEADERBOARD_KEY=${key}`)
console.log('')
console.log(`Scores show up in ${PB}/_/ under "lb_scores". Delete a row there to take someone off the board.`)
