<script setup>
import { ref } from 'vue'

const currentPage = ref('login')
const showPassword = ref(false)
const loginError = ref('')
const loginForm = ref({
  email: '',
  password: '',
  remember: false
})

const user = ref({
  name: 'Mei Chen',
  email: 'mei.chen@example.com',
  phone: '0412 345 678',
  suburb: 'Footscray',
  language: 'English, Mandarin',
  role: 'Volunteer',
  joined: '18 August 2026'
})

const activities = ref([
  { id: 1, date: '22 Aug 2026', activity: 'Shade Corridor Planting', suburb: 'Sunshine West', status: 'Confirmed', hours: 3 },
  { id: 2, date: '30 Aug 2026', activity: 'Kororoit Creek Care Day', suburb: 'Albion', status: 'Saved', hours: '–' },
  { id: 3, date: '12 Jul 2026', activity: 'Pollinator Garden Working Bee', suburb: 'Footscray', status: 'Completed', hours: 2 }
])

function login() {
  loginError.value = ''

  if (!/^\S+@\S+\.\S+$/.test(loginForm.value.email)) {
    loginError.value = 'Please enter a valid email address.'
    return
  }

  if (loginForm.value.password.length < 6) {
    loginError.value = 'Password must contain at least 6 characters.'
    return
  }

  user.value.email = loginForm.value.email
  currentPage.value = 'profile'
}

function logout() {
  loginForm.value.password = ''
  currentPage.value = 'login'
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <button class="brand" type="button" @click="currentPage = 'login'">
        <span class="brand-mark">GL</span>
        <span class="brand-name"><strong>GreenLink</strong><small>Melbourne</small></span>
      </button>

      <nav v-if="currentPage === 'profile'" aria-label="Main navigation">
        <a href="#home" @click.prevent>Home</a>
        <a href="#find" @click.prevent>Find &amp; Plant</a>
        <a class="active" href="#profile" @click.prevent>My GreenLink</a>
        <button class="logout-button" type="button" @click="logout">Log out</button>
      </nav>
    </header>

    <main v-if="currentPage === 'login'" class="login-page">
      <section class="login-intro">
        <div>
          <p class="eyebrow">Welcome back</p>
          <h1>Grow a greener Melbourne with us.</h1>
          <p class="intro-text">Sign in to view your bookings, saved projects and volunteering history.</p>
        </div>

        <div class="impact-note">
          <strong>12,640</strong>
          <span>trees planted by local volunteers</span>
        </div>
      </section>

      <section class="login-panel" aria-labelledby="login-title">
        <div class="login-card">
          <p class="eyebrow">My GreenLink</p>
          <h2 id="login-title">Log in to your account</h2>
          <p class="form-help">Use any valid email and a password of at least 6 characters for this prototype.</p>

          <form novalidate @submit.prevent="login">
            <label for="email">Email address</label>
            <input id="email" v-model.trim="loginForm.email" type="email" autocomplete="email" placeholder="name@example.com" />

            <label for="password">Password</label>
            <div class="password-field">
              <input
                id="password"
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Enter your password"
              />
              <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
            </div>

            <div class="form-options">
              <label class="check-label"><input v-model="loginForm.remember" type="checkbox" /> Remember me</label>
              <a href="#forgot" @click.prevent>Forgot password?</a>
            </div>

            <p v-if="loginError" class="error-message" role="alert">{{ loginError }}</p>

            <button class="primary-button" type="submit">Log in</button>
          </form>

          <p class="register-note">New to GreenLink? <a href="#register" @click.prevent>Create an account</a></p>
        </div>
      </section>
    </main>

    <main v-else class="profile-page">
      <aside class="profile-sidebar">
        <p class="sidebar-title">My GreenLink</p>
        <button class="active" type="button">Overview</button>
        <button type="button">My bookings</button>
        <button type="button">Saved projects</button>
        <button type="button">Impact history</button>
        <button type="button">Profile &amp; preferences</button>
      </aside>

      <div class="profile-content">
        <section class="welcome-row">
          <div>
            <p class="eyebrow">Personal dashboard</p>
            <h1>Welcome back, {{ user.name.split(' ')[0] }}</h1>
            <p>Here is a simple overview of your account and activities.</p>
          </div>
          <div class="avatar" aria-hidden="true">{{ user.name.charAt(0) }}</div>
        </section>

        <section aria-labelledby="personal-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Account</p>
              <h2 id="personal-title">Personal information</h2>
            </div>
            <button class="outline-button" type="button">Edit details</button>
          </div>

          <div class="table-wrap information-table-wrap">
            <table class="information-table">
              <tbody>
                <tr><th scope="row">Full name</th><td>{{ user.name }}</td><th scope="row">Account type</th><td><span class="role-badge">{{ user.role }}</span></td></tr>
                <tr><th scope="row">Email</th><td>{{ user.email }}</td><th scope="row">Phone</th><td>{{ user.phone }}</td></tr>
                <tr><th scope="row">Suburb</th><td>{{ user.suburb }}</td><th scope="row">Preferred language</th><td>{{ user.language }}</td></tr>
                <tr><th scope="row">Member since</th><td>{{ user.joined }}</td><th scope="row">Email updates</th><td>Subscribed</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="summary-cards" aria-label="Volunteer summary">
          <article><strong>3</strong><span>activities</span></article>
          <article><strong>5</strong><span>volunteer hours</span></article>
          <article><strong>12</strong><span>trees planted</span></article>
        </section>

        <section aria-labelledby="activity-title">
          <div class="section-heading activity-heading">
            <div>
              <p class="eyebrow">Participation</p>
              <h2 id="activity-title">Activity history</h2>
            </div>
          </div>

          <div class="table-wrap">
            <table class="activity-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Activity</th>
                  <th scope="col">Suburb</th>
                  <th scope="col">Status</th>
                  <th scope="col">Hours</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="activity in activities" :key="activity.id">
                  <td>{{ activity.date }}</td>
                  <td><strong>{{ activity.activity }}</strong></td>
                  <td>{{ activity.suburb }}</td>
                  <td><span class="status" :class="activity.status.toLowerCase()">{{ activity.status }}</span></td>
                  <td>{{ activity.hours }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>

    <footer>
      <strong>GreenLink Melbourne</strong>
      <span>Local action for greener, cooler neighbourhoods.</span>
    </footer>
  </div>
</template>
