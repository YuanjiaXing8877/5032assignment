<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { profileData } from '../data/profileData'
import { authErrorMessage, login as authenticate } from '../services/auth'
import { sanitizeEmail } from '../utils/sanitize'

const router = useRouter()
const showPassword = ref(false)
const form = reactive({ email: '', password: '' })
const errors = reactive({})
const submitting = ref(false)
const authenticationError = ref('')

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function validateEmail() {
  delete errors.email
  form.email = sanitizeEmail(form.email)
  if (!form.email.trim()) errors.email = 'Email address is required.'
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address.'
}

function validatePassword() {
  delete errors.password
  if (!form.password) errors.password = 'Password is required.'
  else if (form.password.length < 8) errors.password = 'Password must contain at least 8 characters.'
  else if (!/[A-Za-z]/.test(form.password)) errors.password = 'Password must include at least one letter.'
  else if (!/[0-9]/.test(form.password)) errors.password = 'Password must include at least one number.'
  else if (!/[A-Z]/.test(form.password)) errors.password = 'Password must include at least one uppercase letter.'
  else if (!/[^A-Za-z0-9\s]/.test(form.password)) errors.password = 'Password must include at least one special character.'
  else if (/\s/.test(form.password)) errors.password = 'Password must not contain spaces.'
}

function validate() {
  clearErrors()
  validateEmail()
  validatePassword()

  return Object.keys(errors).length === 0
}

function validateField(field) {
  if (field === 'email') validateEmail()
  if (field === 'password') validatePassword()
}

function handleInput(field) {
  if (errors[field]) validateField(field)
}

async function login() {
  if (!validate()) return
  authenticationError.value = ''
  submitting.value = true
  try {
    const user = await authenticate(form.email, form.password)
    Object.assign(profileData.user, { name: user.name, email: user.email, role: user.role })
    const destination = typeof router.currentRoute.value.query.redirect === 'string'
      ? router.currentRoute.value.query.redirect
      : user.role === 'Administrator' ? '/admin' : '/profile'
    router.replace(destination)
  } catch (error) {
    authenticationError.value = authErrorMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="login-page container-xl px-0 my-0 my-sm-4 my-lg-5">
    <div class="login-layout row g-0">
    <section class="login-intro col-12 col-md-5 p-4 p-md-5" aria-labelledby="welcome-title">
      <div>
        <p class="eyebrow">Volunteer portal</p>
        <h1 id="welcome-title">Welcome to GreenLink</h1>
        <p class="intro-text">Manage your local volunteering activities in one place.</p>
        <ul class="login-features">
          <li><i class="pi pi-calendar" aria-hidden="true"></i> Check upcoming bookings</li>
          <li><i class="pi pi-bookmark" aria-hidden="true"></i> Review saved projects</li>
          <li><i class="pi pi-chart-bar" aria-hidden="true"></i> Track volunteer hours</li>
        </ul>
      </div>

      <div class="impact-note">
        <strong>12,640</strong>
        <span>trees planted by local volunteers</span>
      </div>
    </section>

    <section class="login-panel col-12 col-md-7 px-4 py-5 p-md-5" aria-labelledby="login-title">
      <div class="login-card">
        <p class="eyebrow">My GreenLink</p>
        <h2 id="login-title">Member sign in</h2>
        <p class="form-help">Sign in to access your account. New members can create a Volunteer account.</p>

        <form @submit.prevent="login">
          <div class="field-group">
            <label for="email">Email address</label>
            <InputText id="email" v-model.trim="form.email" type="email" required autocomplete="email" placeholder="name@example.com" :invalid="Boolean(errors.email)" :aria-invalid="Boolean(errors.email)" :aria-describedby="errors.email ? 'email-error' : undefined" @blur="validateField('email')" @input="handleInput('email')" />
            <small v-if="errors.email" id="email-error" class="field-error" role="alert">{{ errors.email }}</small>
          </div>

          <div class="field-group">
            <label for="password">Password</label>
            <div class="password-field">
              <InputText id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" required minlength="8" pattern="(?=.*[A-Za-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s])\S{8,}" title="Use at least 8 characters, including a number, an uppercase letter and a special character, with no spaces." autocomplete="current-password" placeholder="Enter your password" :invalid="Boolean(errors.password)" :aria-invalid="Boolean(errors.password)" :aria-describedby="errors.password ? 'password-error' : undefined" @blur="validateField('password')" @input="handleInput('password')" />
              <Button class="password-toggle" type="button" :label="showPassword ? 'Hide' : 'Show'" text :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword" />
            </div>
            <small v-if="errors.password" id="password-error" class="field-error" role="alert">{{ errors.password }}</small>
          </div>

          <Message v-if="Object.keys(errors).length" severity="error" :closable="false" class="validation-summary">Please correct the highlighted fields.</Message>
          <Message v-if="authenticationError" severity="error" :closable="false" class="validation-summary" role="alert">{{ authenticationError }}</Message>
          <Button class="primary-button login-button" type="submit" :label="submitting ? 'Signing in…' : 'Log in'" icon="pi pi-sign-in" :disabled="submitting" />
        </form>

        <p class="auth-switch">New to GreenLink? <RouterLink to="/register">Create an account</RouterLink></p>
        <p class="privacy-note">Your password is handled securely by Firebase Authentication and is never stored by this application.</p>
      </div>
    </section>
    </div>
  </main>
</template>
