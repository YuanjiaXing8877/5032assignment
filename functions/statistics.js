import { HttpsError } from 'firebase-functions/v2/https'

const DAY = 86400000
const LIMIT = 500
const round = value => Math.round((value + Number.EPSILON) * 100) / 100
const fail = (code, message) => { throw new HttpsError(code, message) }
const localParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const cleanSuburb = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
const suburbKey = value => cleanSuburb(value).toLowerCase()

export function monthStart(key) {
  const wall = Date.parse(`${key}-01T00:00:00Z`)
  let epoch = wall
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(localParts.formatToParts(epoch).map(part => [part.type, part.value]))
    epoch += wall - Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`)
  }
  return epoch
}
const monthIndex = key => Number(key.slice(0, 4)) * 12 + Number(key.slice(5)) - 1
const monthKey = index => `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`

export function statisticsFilters(data = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('invalid-argument', 'Choose the statistics filters.')
  const { scope = 'personal', fromMonth, toMonth, suburb = '' } = data
  if (!['personal', 'managed', 'all'].includes(scope)) fail('invalid-argument', 'Choose a valid statistics scope.')
  for (const value of [fromMonth, toMonth]) if (typeof value !== 'string' || !/^(19[7-9]\d|20\d\d|2100)-(0[1-9]|1[0-2])$/.test(value)) fail('invalid-argument', 'Choose valid start and end months.')
  const start = monthIndex(fromMonth)
  const end = monthIndex(toMonth)
  if (end < start || end - start > 11) fail('invalid-argument', 'Select a range of one to twelve months.')
  if (typeof suburb !== 'string' || suburb.length > 80) fail('invalid-argument', 'Choose a valid suburb.')
  const months = Array.from({ length: end - start + 1 }, (_, i) => {
    const key = monthKey(start + i)
    return { key, label: new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', month: 'short', year: 'numeric' }).format(new Date(`${key}-01T12:00:00Z`)), from: monthStart(key), to: monthStart(monthKey(start + i + 1)) }
  })
  return { scope, fromMonth, toMonth, suburb: cleanSuburb(suburb), from: months[0].from, to: months.at(-1).to, months }
}

// Participant identifiers are used only for aggregation, and never leave the server.
export function summariseStatistics(entries, filters, now) {
  const options = new Map()
  for (const { activity } of entries) {
    const label = cleanSuburb(activity.suburb) || 'Unspecified'
    if (!options.has(suburbKey(label))) options.set(suburbKey(label), label)
  }
  const participantIds = new Set()
  const rows = []
  const months = filters.months.map(month => ({ key: month.key, label: month.label, hours: 0 }))
  for (const { id, activity, registrations } of entries) {
    const suburb = options.get(suburbKey(activity.suburb || 'Unspecified')) || 'Unspecified'
    if (filters.suburb && suburbKey(suburb) !== suburbKey(filters.suburb)) continue
    const booked = activity.status === 'Published' ? registrations.filter(person => person.status === 'Booked') : []
    const attended = booked.filter(person => person.attended === true)
    for (const person of booked) participantIds.add(person.id)
    const hoursByMonth = {}
    const monthKeys = []
    let hours = 0
    for (let i = 0; i < filters.months.length; i++) {
      const month = filters.months[i]
      const overlap = Math.max(0, Math.min(activity.endAt, month.to) - Math.max(activity.startAt, month.from))
      if (overlap) monthKeys.push(month.key)
      const credited = activity.endAt <= now ? overlap / 3600000 * attended.length : 0
      hoursByMonth[month.key] = round(credited)
      months[i].hours += credited
      hours += credited
    }
    rows.push({ id, title: String(activity.title || 'Untitled activity'), suburb, startAt: activity.startAt, endAt: activity.endAt, status: activity.status === 'Cancelled' ? 'Cancelled' : activity.endAt <= now ? 'Finished' : activity.startAt <= now ? 'Underway' : 'Upcoming', bookings: booked.length, attendance: attended.length, hours: round(hours), hoursByMonth, monthKeys })
  }
  rows.sort((a, b) => a.startAt - b.startAt || a.title.localeCompare(b.title))
  const suburbs = new Map()
  for (const row of rows) {
    const key = suburbKey(row.suburb)
    const group = suburbs.get(key) || { key, label: row.suburb, activities: 0 }
    group.activities++
    suburbs.set(key, group)
  }
  const totalHours = months.reduce((sum, month) => sum + month.hours, 0)
  return {
    filters: { scope: filters.scope, fromMonth: filters.fromMonth, toMonth: filters.toMonth, suburb: filters.suburb }, generatedAt: now,
    totals: { activities: rows.length, participants: participantIds.size, bookings: rows.reduce((sum, row) => sum + row.bookings, 0), attendance: rows.reduce((sum, row) => sum + row.attendance, 0), hours: round(totalHours) },
    months: months.map(month => ({ ...month, hours: round(month.hours) })),
    suburbs: [...suburbs.values()].sort((a, b) => b.activities - a.activities || a.label.localeCompare(b.label)),
    suburbOptions: [...options.values()].sort((a, b) => a.localeCompare(b)), activities: rows
  }
}

export function statisticsHandler(db, clock = Date.now) {
  return async request => {
    if (!request.auth) fail('unauthenticated', 'Please sign in to view statistics.')
    const uid = request.auth.uid
    const filters = statisticsFilters(request.data)
    const userRef = db.doc(`users/${uid}`)
    const role = (await userRef.get()).data()?.role
    if (!['Volunteer', 'Coordinator', 'Administrator'].includes(role)) fail('permission-denied', 'Your member profile is unavailable.')
    if ((filters.scope === 'managed' && role === 'Volunteer') || (filters.scope === 'all' && role !== 'Administrator')) fail('permission-denied', 'Your role does not allow this statistics scope.')
    const now = clock()
    let snapshots
    let personalBookings = []
    if (filters.scope === 'personal') {
      personalBookings = (await db.collection(`users/${uid}/bookings`).where('status', '==', 'Booked').limit(LIMIT + 1).get()).docs
      if (personalBookings.length > LIMIT) fail('resource-exhausted', 'This account has too many active participation records for this report.')
      snapshots = personalBookings.length ? await db.getAll(...personalBookings.map(item => db.doc(`activities/${item.id}`))) : []
    } else {
      // Activities last at most 24 hours; include the preceding day for cross-month sessions.
      snapshots = (await db.collection('activities').where('startAt', '>=', filters.from - DAY).where('startAt', '<', filters.to).limit(LIMIT + 1).get()).docs
      if (snapshots.length > LIMIT) fail('resource-exhausted', 'This range contains too many activities. Choose fewer months.')
    }
    const entries = snapshots.filter(item => {
      const event = item.data()
      return item.exists && Number.isFinite(event.startAt) && Number.isFinite(event.endAt) && event.endAt > event.startAt && event.endAt > filters.from && event.startAt < filters.to && (filters.scope !== 'managed' || event.coordinatorId === uid)
    }).map(item => ({ id: item.id, activity: item.data(), registrations: [] }))
    // Bounded batches avoid opening a separate unbounded stream for every activity.
    for (let offset = 0; offset < entries.length; offset += 10) await Promise.all(entries.slice(offset, offset + 10).map(async entry => {
      if (filters.suburb && suburbKey(entry.activity.suburb || 'Unspecified') !== suburbKey(filters.suburb)) return
      if (filters.scope === 'personal') {
        const own = await db.doc(`activities/${entry.id}/registrations/${uid}`).get()
        entry.registrations = own.exists ? [{ ...own.data(), id: uid }] : []
      } else if (entry.activity.status === 'Published') {
        const people = await db.collection(`activities/${entry.id}/registrations`).where('status', '==', 'Booked').limit(LIMIT + 1).get()
        if (people.size > LIMIT) fail('resource-exhausted', 'An activity contains too many participants for this report.')
        entry.registrations = people.docs.map(item => ({ ...item.data(), id: item.id }))
      }
    }))
    if ((await userRef.get()).data()?.role !== role) fail('permission-denied', 'Your role changed. Reload the statistics page.')
    return summariseStatistics(entries, filters, now)
  }
}
