import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { buildMail, deliverMail } from './mail.js'

initializeApp()
const apiKey = defineSecret('SENDGRID_API_KEY')
const sender = defineString('SENDGRID_FROM_EMAIL')

export const sendEmail = onCall({ region: 'australia-southeast2', secrets: [apiKey], timeoutSeconds: 60, memory: '256MiB', maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please sign in before sending an email.')
  if (!sender.value() || !apiKey.value()) throw new HttpsError('failed-precondition', 'Email service is not configured yet.')
  let payload
  try { payload = buildMail(request.data, sender.value(), request.auth.token.email) }
  catch (error) { throw new HttpsError('invalid-argument', error.message) }
  const quota = getFirestore().collection('emailQuotas').doc(request.auth.uid)
  await getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(quota)
    const previous = snapshot.data() || {}
    const now = Date.now()
    if (now - (previous.lastAttempt || 0) < 60000) throw new HttpsError('resource-exhausted', 'Please wait one minute before sending another email.')
    const sameDay = previous.day === new Date(now).toISOString().slice(0, 10)
    const count = sameDay ? previous.count || 0 : 0
    if (count >= 20) throw new HttpsError('resource-exhausted', 'Daily email limit reached. Please try again tomorrow.')
    transaction.set(quota, { lastAttempt: now, day: new Date(now).toISOString().slice(0, 10), count: count + 1 })
  })
  try { return await deliverMail(payload, apiKey.value()) }
  catch { throw new HttpsError('unavailable', 'Unable to confirm email acceptance. Check your inbox before trying again.') }
})
