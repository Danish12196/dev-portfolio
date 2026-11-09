// Creates the "guestbook" collection on PocketBase for the site's guestbook.
// It only adds that one collection; nothing else on the server changes.
//
//   macOS/Linux:  PB_EMAIL=you@example.com PB_PASSWORD=... node scripts/setup-guestbook.mjs
//   Windows cmd:  set "PB_EMAIL=you@example.com" && set "PB_PASSWORD=..." && node scripts/setup-guestbook.mjs
//
// PB_URL defaults to https://pb.danishali.dev. The script prints a GUESTBOOK_KEY:
// add it to the Vercel project's environment variables, then redeploy.
//
// Run it again with --new-key to replace the key (for example if it leaked);
// that only rewrites the guestbook collection's rules.
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
const hasKey = `@request.headers.x_guestbook_key = "${key}"`
const rules = {
  // Everyone sees approved notes; only the site's function sees pending ones.
  listRule: `approved = true || ${hasKey}`,
  viewRule: `approved = true || ${hasKey}`,
  createRule: hasKey,
  // Approving, editing and deleting happen in the admin UI.
  updateRule: null,
  deleteRule: null,
}

const existing = await call('/api/collections/guestbook', {}, token)
if (existing.ok) {
  if (!newKey) {
    console.log('The guestbook collection already exists, so nothing was changed.')
    console.log('Run with --new-key to replace its key.')
    process.exit(0)
  }
  const res = await call('/api/collections/guestbook', { method: 'PATCH', body: JSON.stringify(rules) }, token)
  if (!res.ok) {
    console.error(`Could not update the collection (${res.status}):`, JSON.stringify(res.body, null, 2))
    process.exit(1)
  }
} else {
  const res = await call(
    '/api/collections',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'guestbook',
        type: 'base',
        ...rules,
        fields: [
          { name: 'name', type: 'text', required: true, max: 40 },
          { name: 'message', type: 'text', required: true, max: 500 },
          { name: 'approved', type: 'bool' },
          // Salted hash of the sender's IP, used only for rate limiting.
          { name: 'visitor', type: 'text', max: 64 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX `idx_guestbook_created` ON `guestbook` (`created`)'],
      }),
    },
    token,
  )
  if (!res.ok) {
    console.error(`Could not create the collection (${res.status}):`, JSON.stringify(res.body, null, 2))
    process.exit(1)
  }
}

console.log(`Done. The guestbook collection is ready on ${PB}.`)
console.log('')
console.log('Add this to Vercel (Project > Settings > Environment Variables), then redeploy:')
console.log('')
console.log(`  GUESTBOOK_KEY=${key}`)
console.log('')
console.log(`New notes show up in ${PB}/_/ under "guestbook". Tick "approved" to publish one.`)
