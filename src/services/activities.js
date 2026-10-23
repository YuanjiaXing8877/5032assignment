import { computed, onUnmounted, ref, watch } from 'vue'
import { collection, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { authState } from './auth'
import { emailFunctions, firestore } from './firebase'

export function activityError(error) {
  if (['permission-denied', 'functions/permission-denied'].includes(error?.code)) return 'Your current role does not allow this action. Check your account status.'
  if (error?.code === 'functions/internal') return 'The activity service is unavailable. Please try again.'
  return error?.message || 'Unable to complete this activity request.'
}

export async function changeActivity(action, payload = {}) {
  const response = await httpsCallable(emailFunctions, 'manageActivity')({ action, ...payload })
  return response.data
}

export function useActivities() {
  const activities = ref([])
  const bookings = ref({})
  const loading = ref(true)
  const error = ref('')
  const now = ref(Date.now())
  let stopEvents = () => {}
  let stopBookings = () => {}
  const timer = setInterval(() => { now.value = Date.now() }, 30000)
  const stopAuth = watch(() => authState.user?.uid, (uid) => {
    stopEvents(); stopBookings()
    activities.value = []; bookings.value = {}; error.value = ''; loading.value = Boolean(uid)
    if (!uid || !firestore) return
    stopEvents = onSnapshot(collection(firestore, 'activities'), (snapshot) => {
      activities.value = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))
        .sort((a, b) => a.startAt - b.startAt)
      loading.value = false
    }, (failure) => { loading.value = false; error.value = activityError(failure) })
    stopBookings = onSnapshot(collection(firestore, 'users', uid, 'bookings'), (snapshot) => {
      bookings.value = Object.fromEntries(snapshot.docs.map((item) => [item.id, item.data()]))
    }, (failure) => { error.value = activityError(failure) })
  }, { immediate: true })
  const published = computed(() => activities.value.filter((activity) => activity.status === 'Published' && activity.endAt > now.value))
  const history = computed(() => activities.value.filter((activity) => bookings.value[activity.id]).map((activity) => {
    const booking = bookings.value[activity.id]
    const completed = booking.attended && activity.endAt <= now.value && activity.status !== 'Cancelled'
    return {
      ...activity, activity: activity.title, date: formatActivityTime(activity.startAt),
      status: activity.status === 'Cancelled' || booking.status === 'Cancelled' ? 'Cancelled' : completed ? 'Completed' : booking.attended ? 'Attended' : activity.endAt <= now.value ? 'Not attended' : 'Confirmed',
      hours: completed ? Number(((activity.endAt - activity.startAt) / 3600000).toFixed(1)) : 0, trees: 0
    }
  }))
  onUnmounted(() => { stopAuth(); stopEvents(); stopBookings(); clearInterval(timer) })
  return { activities, published, history, bookings, loading, error, now }
}

export function formatActivityTime(milliseconds) {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'medium', timeStyle: 'short' }).format(milliseconds)
}

export function activityStatus(activity, now = Date.now()) {
  if (activity.status === 'Cancelled') return 'Cancelled'
  if (activity.endAt <= now) return 'Finished'
  if (activity.startAt <= now) return 'Underway'
  return activity.bookedCount >= activity.capacity ? 'Full' : 'Upcoming'
}
