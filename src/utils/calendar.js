const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' })
export function melbourneDateKey(epoch) {
  const parts = Object.fromEntries(dateParts.formatToParts(epoch).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
export function shiftDate(key, days) {
  const date = new Date(`${key}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
export function shiftMonth(key, months) {
  const date = new Date(`${key.slice(0, 7)}-01T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(Number(key.slice(8, 10)), lastDay))
  return date.toISOString().slice(0, 10)
}
export function monthDays(key) {
  const first = `${key.slice(0, 7)}-01`
  const offset = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => shiftDate(first, index - offset))
}
export const calendarDateLabel = key => new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', dateStyle: 'full' }).format(new Date(`${key}T12:00:00Z`))
export const calendarMonthLabel = key => new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${key.slice(0, 7)}-01T12:00:00Z`))
export const fallsOnDate = (activity, key) => Number.isFinite(activity.startAt) && Number.isFinite(activity.endAt) && melbourneDateKey(activity.startAt) <= key && melbourneDateKey(activity.endAt - 1) >= key
export const schedulesOverlap = (left, right) => left.startAt < right.endAt && right.startAt < left.endAt
export function bookingConflict(activity, activities, bookings, now = Date.now()) {
  return activities.find(other => other.id !== activity.id && bookings[other.id]?.status === 'Booked' && other.status === 'Published' && other.endAt > now && schedulesOverlap(activity, other))
}
export function bookingConstraint(activity, activities, bookings, now = Date.now()) {
  if (activity.status !== 'Published') return 'This activity has been cancelled.'
  if (activity.startAt <= now) return 'Bookings close when the activity starts.'
  if (activity.bookedCount >= activity.capacity) return 'This activity is full.'
  const conflict = bookingConflict(activity, activities, bookings, now)
  return conflict ? `Time conflict with your booking for ${conflict.title}.` : ''
}
export function calendarKeyDate(key, current, shift = false) {
  const weekday = (new Date(`${current}T12:00:00Z`).getUTCDay() + 6) % 7
  if (key === 'ArrowLeft') return shiftDate(current, -1)
  if (key === 'ArrowRight') return shiftDate(current, 1)
  if (key === 'ArrowUp') return shiftDate(current, -7)
  if (key === 'ArrowDown') return shiftDate(current, 7)
  if (key === 'Home') return shiftDate(current, -weekday)
  if (key === 'End') return shiftDate(current, 6 - weekday)
  if (key === 'PageUp') return shiftMonth(current, shift ? -12 : -1)
  if (key === 'PageDown') return shiftMonth(current, shift ? 12 : 1)
  return null
}
