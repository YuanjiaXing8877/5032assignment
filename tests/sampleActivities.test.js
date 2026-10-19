import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSampleActivities } from '../scripts/sampleActivities.js'
import { validateActivity } from '../functions/activities.js'

test('sample sessions are future, valid activities with stable distinct IDs and verified meeting locations', () => {
  for (const date of ['2026-10-19T00:00:00Z', '2026-10-24T01:00:00Z', '2026-12-31T15:30:00Z']) {
    const now = Date.parse(date)
    const rows = buildSampleActivities(now)
    assert.equal(rows.length, 6)
    assert.equal(new Set(rows.map(row => row.id)).size, 6)
    for (const row of rows) {
      validateActivity(row, now)
      assert.ok(row.startAt > now + 4 * 86400000)
      assert.match(row.locationSource, /^https:\/\//)
      assert.equal(row.coordinatorId, undefined)
      assert.equal(row.bookedCount, undefined)
    }
    assert.deepEqual(rows.map(row => row.id), buildSampleActivities(now + 40 * 86400000).map(row => row.id))
  }
})
