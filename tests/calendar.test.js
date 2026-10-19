import test from 'node:test'
import assert from 'node:assert/strict'
import { bookingConflict, bookingConstraint, calendarKeyDate, fallsOnDate, melbourneDateKey, monthDays, schedulesOverlap, shiftDate, shiftMonth } from '../src/utils/calendar.js'
import { schedulesOverlap as serverOverlap } from '../functions/activities.js'
import { parseActivityTime } from '../src/utils/activityTime.js'

test('calendar dates use Melbourne rather than browser timezone and handle DST and midnight', () => {
  assert.equal(melbourneDateKey(Date.parse('2026-12-31T14:00:00Z')), '2027-01-01')
  assert.equal(melbourneDateKey(Date.parse('2026-07-01T14:00:00Z')), '2026-07-02')
  assert.equal(shiftDate('2026-10-04', -1), '2026-10-03')
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01')
  const activity = { startAt: parseActivityTime('2026-10-03T23:30'), endAt: parseActivityTime('2026-10-04T03:30') }
  assert.equal(fallsOnDate(activity, '2026-10-03'), true)
  assert.equal(fallsOnDate(activity, '2026-10-04'), true)
  assert.equal(fallsOnDate(activity, '2026-10-05'), false)
  assert.equal(fallsOnDate({ ...activity, endAt: parseActivityTime('2026-10-04T00:00') }, '2026-10-04'), false)
})
test('month navigation clamps to valid days and leap years; the six-week grid starts on Monday', () => {
  assert.equal(shiftMonth('2026-01-31', 1), '2026-02-28')
  assert.equal(shiftMonth('2028-01-31', 1), '2028-02-29')
  assert.equal(shiftMonth('2026-01-31', -1), '2025-12-31')
  const days = monthDays('2026-10-19')
  assert.equal(days.length, 42)
  assert.equal(days[0], '2026-09-28')
  assert.equal(new Set(days).size, 42)
  assert.ok(days.includes('2026-10-31'))
})
test('calendar keyboard navigation crosses months/years and preserves native Tab', () => {
  assert.equal(calendarKeyDate('ArrowRight', '2026-12-31'), '2027-01-01')
  assert.equal(calendarKeyDate('ArrowUp', '2026-10-19'), '2026-10-12')
  assert.equal(calendarKeyDate('Home', '2026-10-21'), '2026-10-19')
  assert.equal(calendarKeyDate('End', '2026-10-21'), '2026-10-25')
  assert.equal(calendarKeyDate('PageDown', '2026-01-31'), '2026-02-28')
  assert.equal(calendarKeyDate('PageUp', '2028-02-29', true), '2027-02-28')
  assert.equal(calendarKeyDate('Tab', '2026-10-19'), null)
})
test('conflicts match backend interval semantics, skip withdrawn/cancelled/past/self bookings and allow adjacent slots', () => {
  const activity = { id: 'new', title: 'New activity', startAt: 100, endAt: 200, status: 'Published', bookedCount: 0, capacity: 5 }
  const existing = { id: 'old', title: 'Existing activity', startAt: 150, endAt: 250, status: 'Published' }
  assert.equal(bookingConflict(activity, [activity, existing], { old: { status: 'Booked' } }, 50)?.id, 'old')
  assert.match(bookingConstraint(activity, [existing], { old: { status: 'Booked' } }, 50), /Time conflict/)
  for (const [other, booking, now] of [[existing, 'Cancelled', 50], [{ ...existing, status: 'Cancelled' }, 'Booked', 50], [{ ...existing, startAt: 200 }, 'Booked', 50], [existing, 'Booked', 300], [{ ...existing, id: 'new' }, 'Booked', 50]]) {
    assert.equal(bookingConflict(activity, [other], { [other.id]: { status: booking } }, now), undefined)
  }
  for (const other of [existing, { startAt: 200, endAt: 300 }, { startAt: 0, endAt: 100 }, { startAt: 120, endAt: 180 }]) assert.equal(schedulesOverlap(activity, other), serverOverlap(activity, other))
  assert.match(bookingConstraint({ ...activity, bookedCount: 5 }, [], {}, 50), /full/)
  assert.match(bookingConstraint(activity, [], {}, 100), /Bookings close/)
  assert.match(bookingConstraint({ ...activity, status: 'Cancelled' }, [], {}, 50), /cancelled/)
})
