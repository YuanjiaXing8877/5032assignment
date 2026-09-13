import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { authState } from './auth'
import { firebaseConfigured, firestore } from './firebase'
import { sanitizePlainText } from '../utils/sanitize'

function activityKey(activityId) {
  return String(activityId)
}

export function watchActivityRatings(activityId, onUpdate, onError) {
  if (!firebaseConfigured) {
    onError(new Error('Firebase is not configured.'))
    return () => {}
  }

  const key = activityKey(activityId)
  const ratingsQuery = query(collection(firestore, 'ratings'), where('activityId', '==', key))

  return onSnapshot(ratingsQuery, (snapshot) => {
    const ratings = snapshot.docs.map((ratingDocument) => ratingDocument.data())
    const total = ratings.reduce((sum, rating) => sum + rating.score, 0)
    const ownRating = ratings.find((rating) => rating.userId === authState.user?.uid)

    onUpdate({
      average: ratings.length ? total / ratings.length : 0,
      count: ratings.length,
      ownScore: ownRating?.score || 0
    })
  }, onError)
}

export async function saveActivityRating(activity, score) {
  if (!firebaseConfigured || !authState.user) throw new Error('You must be signed in to rate an activity.')
  if (activity.status !== 'Completed') throw new Error('Only completed activities can be rated.')
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error('Choose a rating from 1 to 5 stars.')

  const key = activityKey(activity.id)
  const ratingId = `${key}_${authState.user.uid}`
  await setDoc(doc(firestore, 'ratings', ratingId), {
    activityId: key,
    activityTitle: sanitizePlainText(activity.activity, 100),
    userId: authState.user.uid,
    score,
    updatedAt: serverTimestamp()
  })
}
