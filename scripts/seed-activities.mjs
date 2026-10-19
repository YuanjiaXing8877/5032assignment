import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { buildSampleActivities } from './sampleActivities.js'
import { activityTimeInput } from '../src/utils/activityTime.js'

const args = process.argv.slice(2)
const project = args[args.indexOf('--project') + 1]
const coordinatorId = args[args.indexOf('--coordinator') + 1]
if (!args.includes('--project') || !args.includes('--coordinator') || !/^[a-z][a-z0-9-]+$/.test(project) || !/^[A-Za-z0-9_-]{1,128}$/.test(coordinatorId)) {
  throw new Error('Usage: node scripts/seed-activities.mjs --project PROJECT --coordinator UID [--apply]')
}
const apply = args.includes('--apply')
const require = createRequire(import.meta.url)
const firebaseBin = realpathSync(execFileSync('which', ['firebase'], { encoding: 'utf8' }).trim())
const auth = require(resolve(dirname(firebaseBin), '../auth.js'))
const account = auth.getGlobalDefaultAccount()
if (!account) throw new Error('Sign into the Firebase CLI first.')
const token = account.tokens.expires_at > Date.now() + 60000 ? account.tokens : await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform'])
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`
async function request(path, body) {
  const response = await fetch(root + path, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Firestore request failed: HTTP ${response.status}`)
  return response.json()
}
function encode(value) {
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } }
}
const owner = await request(`/users/${coordinatorId}`)
const role = owner?.fields?.role?.stringValue
if (!['Coordinator', 'Administrator'].includes(role)) throw new Error('Select an existing Coordinator or Administrator. No role changes are performed.')
const coordinatorName = owner.fields.name?.stringValue || 'GreenLink coordinator'
const proposed = buildSampleActivities()
const states = await Promise.all(proposed.map(async activity => ({ activity, existing: await request(`/activities/${activity.id}`) })))
const missing = states.filter(item => !item.existing).map(item => item.activity)
for (const { activity, existing } of states) {
  const startAt = existing ? Number(existing.fields.startAt.integerValue) : activity.startAt
  const capacity = existing ? Number(existing.fields.capacity.integerValue) : activity.capacity
  console.log(`${existing ? 'KEEP' : 'CREATE'} ${activity.id}: ${existing?.fields.title.stringValue || activity.title} | ${activityTimeInput(startAt)} Melbourne | ${capacity} places`)
}
console.log(`${apply ? 'Apply' : 'Preview'}: ${missing.length} new activities for ${coordinatorName}; existing activities, bookings and ratings are preserved.`)
if (apply && missing.length) {
  const prefix = `projects/${project}/databases/(default)/documents`
  const writes = missing.map(({ id, ...activity }) => ({
    update: { name: `${prefix}/activities/${id}`, fields: Object.fromEntries(Object.entries({ ...activity, coordinatorId, coordinatorName, status: 'Published', bookedCount: 0, version: 1, isSample: true }).map(([key, value]) => [key, encode(value)])) },
    currentDocument: { exists: false },
    updateTransforms: ['createdAt', 'updatedAt'].map(fieldPath => ({ fieldPath, setToServerValue: 'REQUEST_TIME' }))
  }))
  await request(':commit', { writes })
  console.log(`Created ${missing.length} published activities. No volunteer bookings or attendance were fabricated.`)
}
