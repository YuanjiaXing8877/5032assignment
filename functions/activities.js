import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'

const fail = (message, code = 'failed-precondition') => { throw new HttpsError(code, message) }
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value)

export function validateActivity(data, now = Date.now()) {
  const title = text(data?.title, 120)
  const description = text(data?.description, 3000)
  const suburb = text(data?.suburb, 80)
  const address = text(data?.address, 250)
  const startAt = Number(data?.startAt)
  const endAt = Number(data?.endAt)
  const capacity = Number(data?.capacity)
  const lat = data?.location?.lat
  const lng = data?.location?.lng
  if (title.length < 3 || description.length < 10 || !suburb || !address) fail('Complete the title, description, suburb and meeting address.', 'invalid-argument')
  if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || startAt <= now || endAt <= startAt || endAt - startAt > 24 * 3600000) fail('Choose a future start and an end within 24 hours of the start.', 'invalid-argument')
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) fail('Capacity must be a whole number from 1 to 500.', 'invalid-argument')
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -44 || lat > -10 || lng < 112 || lng > 154) fail('Search for and select an Australian meeting address.', 'invalid-argument')
  return { title, description, suburb, address, startAt, endAt, capacity, location: { lat, lng, label: address } }
}

// All mutations read roles and availability again inside one transaction.
export function activityHandler(db, clock = Date.now) {
  return async (request) => {
    if (!request.auth) fail('Please sign in.', 'unauthenticated')
    const { action, activityId, data, participantId, attended, version } = request.data || {}
    if (!['save', 'cancel', 'book', 'withdraw', 'attendance'].includes(action)) fail('Unknown activity action.', 'invalid-argument')
    if (activityId !== undefined && !validId(activityId)) fail('Invalid activity.', 'invalid-argument')
    if (action !== 'save' && !activityId) fail('Select an activity.', 'invalid-argument')
    const uid = request.auth.uid
    const activityRef = activityId ? db.doc(`activities/${activityId}`) : db.collection('activities').doc()
    return db.runTransaction(async (tx) => {
      const now = clock()
      const userDoc = await tx.get(db.doc(`users/${uid}`))
      if (!userDoc.exists) fail('Your member profile is unavailable.', 'permission-denied')
      const user = userDoc.data()
      const snapshot = await tx.get(activityRef)
      const event = snapshot.data()
      const manager = user.role === 'Administrator' || (user.role === 'Coordinator' && event?.coordinatorId === uid)
      const changed = { updatedAt: FieldValue.serverTimestamp(), version: (event?.version || 0) + 1 }
      if (action === 'save') {
        if (!['Coordinator', 'Administrator'].includes(user.role)) fail('Coordinator approval is required to publish activities.', 'permission-denied')
        if (activityId && !event) fail('This activity no longer exists.', 'not-found')
        if (event && !manager) fail('You can only edit your own activities.', 'permission-denied')
        if (event && (event.status !== 'Published' || event.startAt <= now)) fail('Started or cancelled activities cannot be edited.')
        if (event && version !== event.version) fail('This activity changed. Reload it before saving.', 'aborted')
        const clean = validateActivity(data, now)
        if (clean.capacity < (event?.bookedCount || 0)) fail('Capacity cannot be lower than the current bookings.')
        tx.set(activityRef, {
          ...clean, ...changed,
          coordinatorId: event?.coordinatorId || uid,
          coordinatorName: event?.coordinatorName || user.name || 'GreenLink coordinator',
          status: 'Published', bookedCount: event?.bookedCount || 0,
          createdAt: event?.createdAt || FieldValue.serverTimestamp()
        })
        return { id: activityRef.id }
      }
      if (!event) fail('This activity no longer exists.', 'not-found')
      if (action === 'cancel') {
        if (!manager) fail('You can only cancel your own activities.', 'permission-denied')
        if (event.status === 'Cancelled') return { id: activityRef.id }
        if (event.startAt <= now) fail('An activity that has started cannot be cancelled.')
        tx.update(activityRef, { ...changed, status: 'Cancelled' })
        return { id: activityRef.id }
      }
      const targetId = action === 'attendance' ? participantId : uid
      if (!validId(targetId)) fail('Invalid participant.', 'invalid-argument')
      if (action === 'attendance' && !manager) fail('Only the activity coordinator can manage attendance.', 'permission-denied')
      const bookingRef = activityRef.collection('registrations').doc(targetId)
      const bookingDoc = await tx.get(bookingRef)
      const booking = bookingDoc.data()
      const ownRef = db.doc(`users/${targetId}/bookings/${activityRef.id}`)
      const eventInfo = { activityId: activityRef.id }
      if (action === 'attendance') {
        if (typeof attended !== 'boolean') fail('Invalid attendance value.', 'invalid-argument')
        if (event.status !== 'Published' || event.startAt > now) fail('Attendance can be recorded after the activity starts.')
        if (booking?.status !== 'Booked') fail('Only booked participants can be checked in.')
        tx.update(bookingRef, { attended, updatedAt: FieldValue.serverTimestamp() })
        tx.set(ownRef, { ...eventInfo, status: 'Booked', attended, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        return { id: activityRef.id }
      }
      if (action === 'book') {
        if (event.status !== 'Published' || event.startAt <= now) fail('Booking is closed for this activity.')
        if (booking?.status === 'Booked') return { id: activityRef.id }
        if (event.bookedCount >= event.capacity) fail('This activity is full.', 'resource-exhausted')
        tx.set(bookingRef, { uid, name: user.name || 'GreenLink member', email: request.auth.token.email || user.email || '', status: 'Booked', attended: false, updatedAt: FieldValue.serverTimestamp() })
        tx.set(ownRef, { ...eventInfo, status: 'Booked', attended: false, updatedAt: FieldValue.serverTimestamp() })
        tx.update(activityRef, { ...changed, bookedCount: event.bookedCount + 1 })
      } else {
        if (booking?.status !== 'Booked') return { id: activityRef.id }
        if (event.status !== 'Cancelled' && event.startAt <= now) fail('Contact the coordinator to change a booking after the activity starts.')
        tx.update(bookingRef, { status: 'Cancelled', attended: false, updatedAt: FieldValue.serverTimestamp() })
        tx.set(ownRef, { ...eventInfo, status: 'Cancelled', attended: false, updatedAt: FieldValue.serverTimestamp() })
        tx.update(activityRef, { ...changed, bookedCount: Math.max(0, event.bookedCount - 1) })
      }
      return { id: activityRef.id }
    })
  }
}
