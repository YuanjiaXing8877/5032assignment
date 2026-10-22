import { createHash } from 'node:crypto'
import { HttpsError } from 'firebase-functions/v2/https'
import { buildMail } from './mail.js'

const MAX_RECIPIENTS = 50
const DAILY_LIMIT = 100
const DAY = 86400000
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value)
const digest = value => createHash('sha256').update(value).digest('hex')
const fail = (code, message) => { throw new HttpsError(code, message) }
const summary = (id, batch) => ({ batchId: id, status: batch.status, recipientCount: batch.recipientCount })

// Reserve the batch before contacting the provider. Replays never send it twice.
export function bulkMailHandler(db, deliver, clock = Date.now) {
  return async request => {
    if (!request.auth) fail('unauthenticated', 'Please sign in before sending activity emails.')
    const { activityId, requestId, participantIds, subject, message, attachments = [] } = request.data || {}
    if (!validId(activityId) || typeof requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)) fail('invalid-argument', 'Select an activity and prepare the email again.')
    if (!Array.isArray(participantIds) || !participantIds.length || participantIds.length > MAX_RECIPIENTS || !participantIds.every(validId) || new Set(participantIds).size !== participantIds.length) fail('invalid-argument', 'Select between 1 and 50 booked participants.')
    const ids = [...participantIds].sort()
    const uid = request.auth.uid
    const fingerprint = digest(JSON.stringify({ uid, activityId, ids, subject, message, attachments }))
    const activityRef = db.doc(`activities/${activityId}`)
    const batchRef = activityRef.collection('emailBatches').doc(`${uid}_${requestId}`)
    const duplicateRef = db.doc(`bulkEmailDedupe/${fingerprint}`)
    const quotaRef = db.doc(`bulkEmailQuotas/${uid}`)
    const reservation = await db.runTransaction(async tx => {
      const now = clock()
      const [userDoc, activityDoc, batchDoc] = await tx.getAll(db.doc(`users/${uid}`), activityRef, batchRef)
      const user = userDoc.data()
      const activity = activityDoc.data()
      if (!user || (user.role !== 'Administrator' && !(user.role === 'Coordinator' && activity?.coordinatorId === uid))) fail('permission-denied', 'Only the activity coordinator or an administrator can send these emails.')
      if (!activity) fail('not-found', 'This activity no longer exists.')
      if (batchDoc.exists) {
        if (batchDoc.data().fingerprint !== fingerprint) fail('already-exists', 'This request was already used. Prepare a new email.')
        return { existing: summary(batchRef.id, batchDoc.data()) }
      }
      const duplicate = await tx.get(duplicateRef)
      if (duplicate.exists && duplicate.data().expiresAt > now) {
        const previous = await tx.get(activityRef.collection('emailBatches').doc(duplicate.data().batchId))
        if (previous.exists && previous.data().status !== 'Rejected') return { existing: summary(previous.id, previous.data()) }
      }
      const registrations = await tx.getAll(...ids.map(id => activityRef.collection('registrations').doc(id)))
      const unique = new Map()
      for (const registration of registrations) {
        const person = registration.data()
        if (!person || person.status !== 'Booked') fail('failed-precondition', 'A selected participant has withdrawn. Refresh the participant list and prepare the email again.')
        const email = typeof person.email === 'string' ? person.email.trim() : ''
        if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length > 254) fail('failed-precondition', 'A selected participant has no valid email address. Update the selection.')
        if (!unique.has(email.toLowerCase())) unique.set(email.toLowerCase(), { id: registration.id, name: String(person.name || 'GreenLink member').slice(0, 80), email })
      }
      const recipients = [...unique.values()]
      let payload
      try { payload = buildMail({ to: recipients[0].email, subject, message, attachments }, request.sender, request.auth.token.email, { requireAttachment: false }) }
      catch (error) { fail('invalid-argument', error.message) }
      payload.personalizations = recipients.map(person => ({ to: [{ email: person.email }] }))
      const quota = (await tx.get(quotaRef)).data() || {}
      const day = new Date(now).toISOString().slice(0, 10)
      const count = quota.day === day ? quota.count || 0 : 0
      if (now - (quota.lastAttempt || 0) < 60000) fail('resource-exhausted', 'Wait one minute before starting another batch.')
      if (count + recipients.length > DAILY_LIMIT) fail('resource-exhausted', 'Your bulk email limit is 100 recipient addresses per UTC day. Select fewer recipients or try tomorrow.')
      const batch = {
        senderUid: uid, activityTitle: activity.title, subject: payload.subject, fingerprint,
        recipientCount: recipients.length, recipients,
        attachments: (payload.attachments || []).map(file => ({ filename: file.filename, bytes: Buffer.from(file.content, 'base64').length })),
        status: 'Sending', createdAt: now, updatedAt: now,
        detail: 'Submitting to the email service. Inbox delivery has not been confirmed.'
      }
      tx.create(batchRef, batch)
      tx.set(duplicateRef, { batchId: batchRef.id, expiresAt: now + DAY })
      tx.set(quotaRef, { day, count: count + recipients.length, lastAttempt: now })
      return { payload, batch }
    })
    if (reservation.existing) return reservation.existing
    let status = 'Accepted'
    let detail = 'The email service accepted this batch. This does not confirm inbox delivery.'
    try { await deliver(reservation.payload) }
    catch (error) {
      status = error.providerStatus >= 400 && error.providerStatus < 500 ? 'Rejected' : 'Unconfirmed'
      detail = status === 'Rejected' ? error.message : 'The result could not be confirmed. Check SendGrid activity before preparing another email; this batch will not be resent automatically.'
    }
    await batchRef.update({ status, detail, updatedAt: clock() })
    return summary(batchRef.id, { ...reservation.batch, status })
  }
}
