import { computed, reactive } from 'vue'

const DEMO_USERS_KEY = 'greenlink-demo-users-v1'
const DEMO_SESSION_KEY = 'greenlink-demo-session-v1'
export const authState = reactive({
  user: null,
  ready: false,
  provider: 'local'
})

export const isAuthenticated = computed(() => Boolean(authState.user))
export const isAdministrator = computed(() => authState.user?.role === 'Administrator')

function normaliseEmail(email) {
  return email.trim().toLowerCase()
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function getDemoUsers() {
  const saved = JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '[]')
  if (saved.length) return saved

  const seeded = [
    { id: 'demo-volunteer', name: 'Mei Chen', email: 'volunteer@greenlink.test', role: 'Volunteer', passwordHash: await hashPassword('Volunteer1!') },
    { id: 'demo-coordinator', name: 'Amina Abdi', email: 'coordinator@greenlink.test', role: 'Coordinator', passwordHash: await hashPassword('Coordinator1!') },
    { id: 'demo-admin', name: 'David Nguyen', email: 'admin@greenlink.test', role: 'Administrator', passwordHash: await hashPassword('Administrator1!') }
  ]
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(seeded))
  return seeded
}

function publicUser(user) {
  return { id: user.id, uid: user.uid || user.id, name: user.name, email: user.email, role: user.role }
}

let initialisationPromise

export function initialiseAuth() {
  if (initialisationPromise) return initialisationPromise

  initialisationPromise = new Promise((resolve) => {
    const session = JSON.parse(sessionStorage.getItem(DEMO_SESSION_KEY) || 'null')
    authState.user = session
    authState.ready = true
    resolve()
  })

  return initialisationPromise
}

export async function login(email, password) {
  const cleanEmail = normaliseEmail(email)
  const users = await getDemoUsers()
  const passwordHash = await hashPassword(password)
  const account = users.find((user) => user.email === cleanEmail && user.passwordHash === passwordHash)
  if (!account) throw new Error('auth/invalid-credential')
  authState.user = publicUser(account)
  sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(authState.user))
  return authState.user
}

export async function register({ name, email, password }) {
  const cleanEmail = normaliseEmail(email)
  const cleanName = name.trim()

  const users = await getDemoUsers()
  if (users.some((user) => user.email === cleanEmail)) throw new Error('auth/email-already-in-use')
  const account = {
    id: crypto.randomUUID(),
    name: cleanName,
    email: cleanEmail,
    role: 'Volunteer',
    passwordHash: await hashPassword(password)
  }
  users.push(account)
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users))
  authState.user = publicUser(account)
  sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(authState.user))
  return authState.user
}

export async function logout() {
  sessionStorage.removeItem(DEMO_SESSION_KEY)
  authState.user = null
}

export function canAccess(roles = []) {
  return !roles.length || roles.includes(authState.user?.role)
}

export function authErrorMessage(error) {
  const code = error?.code || error?.message
  const messages = {
    'auth/invalid-credential': 'The email address or password is incorrect.',
    'auth/user-not-found': 'The email address or password is incorrect.',
    'auth/wrong-password': 'The email address or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists for this email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
    'auth/network-request-failed': 'Unable to contact the authentication service. Check your connection.'
  }
  return messages[code] || 'Authentication was unsuccessful. Please try again.'
}
