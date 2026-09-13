import { computed, reactive } from 'vue'
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth'
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { firebaseAuth, firebaseConfigured, firestore } from './firebase'

const allowedRoles = ['Volunteer', 'Coordinator', 'Administrator']

export const authState = reactive({
  user: null,
  ready: false,
  provider: 'firebase',
  configured: firebaseConfigured
})

export const isAuthenticated = computed(() => Boolean(authState.user))
export const isAdministrator = computed(() => authState.user?.role === 'Administrator')

function normaliseEmail(email) {
  return email.trim().toLowerCase()
}

async function createPublicUser(firebaseUser) {
  let account = {}

  try {
    const snapshot = await getDoc(doc(firestore, 'users', firebaseUser.uid))
    if (snapshot.exists()) account = snapshot.data()
  } catch (error) {
    console.error('Unable to load the user profile.', error)
  }

  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    name: account.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'GreenLink member',
    email: firebaseUser.email,
    role: allowedRoles.includes(account.role) ? account.role : 'Volunteer',
    requestedRole: account.requestedRole || 'Volunteer',
    approvalStatus: account.approvalStatus || 'Not requested'
  }
}

let initialisationPromise

export function initialiseAuth() {
  if (initialisationPromise) return initialisationPromise

  if (!firebaseConfigured) {
    authState.ready = true
    initialisationPromise = Promise.resolve()
    return initialisationPromise
  }

  initialisationPromise = setPersistence(firebaseAuth, browserSessionPersistence)
    .then(() => new Promise((resolve) => {
      onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
        authState.user = firebaseUser ? await createPublicUser(firebaseUser) : null
        authState.ready = true
        resolve()
      })
    }))
    .catch((error) => {
      authState.ready = true
      throw error
    })

  return initialisationPromise
}

function requireFirebaseConfiguration() {
  if (!firebaseConfigured) throw new Error('auth/missing-configuration')
}

export async function login(email, password) {
  requireFirebaseConfiguration()
  const credential = await signInWithEmailAndPassword(firebaseAuth, normaliseEmail(email), password)
  authState.user = await createPublicUser(credential.user)
  return authState.user
}

export async function register({ name, email, password, requestedRole = 'Volunteer' }) {
  requireFirebaseConfiguration()
  const cleanName = name.trim()
  const cleanEmail = normaliseEmail(email)
  const safeRequestedRole = requestedRole === 'Coordinator' ? 'Coordinator' : 'Volunteer'
  const credential = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, password)

  await updateProfile(credential.user, { displayName: cleanName })
  await setDoc(doc(firestore, 'users', credential.user.uid), {
    name: cleanName,
    email: cleanEmail,
    role: 'Volunteer',
    requestedRole: safeRequestedRole,
    approvalStatus: safeRequestedRole === 'Coordinator' ? 'Pending' : 'Not requested',
    createdAt: serverTimestamp()
  })

  authState.user = await createPublicUser(credential.user)
  return authState.user
}

export async function logout() {
  requireFirebaseConfiguration()
  await signOut(firebaseAuth)
  authState.user = null
}

export function canAccess(roles = []) {
  return !roles.length || roles.includes(authState.user?.role)
}

export async function listUserAccounts() {
  requireFirebaseConfiguration()
  if (!isAdministrator.value) throw new Error('auth/insufficient-permission')

  const snapshot = await getDocs(collection(firestore, 'users'))
  return snapshot.docs
    .map((userDocument) => ({ id: userDocument.id, ...userDocument.data() }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export async function updateUserRole(userId, role) {
  requireFirebaseConfiguration()
  if (!isAdministrator.value) throw new Error('auth/insufficient-permission')
  if (userId === authState.user.uid) throw new Error('auth/cannot-change-own-role')
  if (!allowedRoles.includes(role)) throw new Error('auth/invalid-role')

  await updateDoc(doc(firestore, 'users', userId), {
    role,
    approvalStatus: role === 'Volunteer' ? 'Not requested' : 'Approved'
  })
}

export function authErrorMessage(error) {
  const messages = {
    'auth/missing-configuration': 'Firebase is not configured yet. Add the project settings to .env.local and restart the development server.',
    'auth/configuration-not-found': 'Firebase Authentication is not enabled for this project yet. Enable Email/Password sign-in in Firebase Console.',
    'auth/invalid-credential': 'The email address or password is incorrect.',
    'auth/user-not-found': 'The email address or password is incorrect.',
    'auth/wrong-password': 'The email address or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists for this email address.',
    'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
    'auth/network-request-failed': 'Unable to contact Firebase. Check your connection and try again.',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase Authentication.',
    'auth/insufficient-permission': 'Only administrators can manage user roles.',
    'auth/cannot-change-own-role': 'You cannot change your own administrator role.',
    'permission-denied': 'Firestore denied this operation. Confirm that the latest security rules are deployed.'
  }
  return messages[error?.code || error?.message] || 'Authentication was unsuccessful. Please try again.'
}
