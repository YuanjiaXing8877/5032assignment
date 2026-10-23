<script setup>
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { profileData } from '../data/profileData'
import { authErrorMessage, register } from '../services/auth'
import { sanitizeEmail, sanitizePlainText } from '../utils/sanitize'
import { focusFirstError, focusTarget } from '../utils/accessibility'

const router = useRouter()
const showPassword = ref(false)
const submitting = ref(false)
const authenticationError = ref('')
const form = reactive({ name: '', email: '', password: '', confirmPassword: '', requestedRole: 'Volunteer' })
const errors = reactive({})

function validate() {
  Object.keys(errors).forEach((key) => delete errors[key])
  form.name = sanitizePlainText(form.name, 80)
  form.email = sanitizeEmail(form.email)
  if (form.name.trim().length < 2) errors.name = 'Enter your full name.'
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address.'
  if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9\s]/.test(form.password) || /\s/.test(form.password)) {
    errors.password = 'Use at least 8 characters with an uppercase letter, number and special character, and no spaces.'
  }
  if (!form.confirmPassword) errors.confirmPassword = 'Confirm your password.'
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.'
  return Object.keys(errors).length === 0
}

async function submitRegistration(event) {
  if (!validate()) { focusFirstError(event.currentTarget); return }
  submitting.value = true
  authenticationError.value = ''
  try {
    const user = await register(form)
    Object.assign(profileData.user, { name: user.name, email: user.email, role: user.role })
    router.replace('/profile')
  } catch (error) {
    authenticationError.value = authErrorMessage(error)
    focusTarget('#registration-error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main id="main-content" tabindex="-1" class="auth-page container-xl">
    <section class="auth-card" aria-labelledby="register-title">
      <p class="eyebrow">Join GreenLink</p>
      <h1 id="register-title">Create your account</h1>
      <p class="form-help">Create a Volunteer account or request Coordinator access. Staff access requires administrator approval.</p>

      <form @submit.prevent="submitRegistration" novalidate :aria-busy="submitting">
        <div class="field-group">
          <label for="register-name">Full name</label>
          <InputText id="register-name" v-model.trim="form.name" autocomplete="name" maxlength="80" required :invalid="Boolean(errors.name)" :aria-invalid="Boolean(errors.name)" :aria-describedby="errors.name ? 'register-name-error' : undefined" />
          <small v-if="errors.name" id="register-name-error" class="field-error">{{ errors.name }}</small>
        </div>
        <div class="field-group">
          <label for="register-email">Email address</label>
          <InputText id="register-email" v-model.trim="form.email" type="email" autocomplete="email" maxlength="120" required :invalid="Boolean(errors.email)" :aria-invalid="Boolean(errors.email)" :aria-describedby="errors.email ? 'register-email-error' : undefined" />
          <small v-if="errors.email" id="register-email-error" class="field-error">{{ errors.email }}</small>
        </div>
        <div class="field-group">
          <label for="requested-role">How would you like to participate?</label>
          <select id="requested-role" v-model="form.requestedRole" class="form-select profile-select" aria-describedby="role-help">
            <option value="Volunteer">Volunteer</option>
            <option value="Coordinator">Apply to be a Coordinator</option>
          </select>
          <small id="role-help" class="field-hint">Coordinator requests remain Volunteer accounts until an administrator approves them.</small>
        </div>
        <div class="field-group">
          <label for="register-password">Password</label>
          <div class="password-field">
            <InputText id="register-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required :invalid="Boolean(errors.password)" :aria-invalid="Boolean(errors.password)" :aria-describedby="errors.password ? 'register-password-help register-password-error' : 'register-password-help'" />
            <Button class="password-toggle" type="button" :label="showPassword ? 'Hide' : 'Show'" :aria-label="showPassword ? 'Hide passwords' : 'Show passwords'" text @click="showPassword = !showPassword" />
          </div>
          <small id="register-password-help" class="field-hint">Use at least 8 characters, including an uppercase letter, a number and a special character. Do not include spaces.</small>
          <small v-if="errors.password" id="register-password-error" class="field-error">{{ errors.password }}</small>
        </div>
        <div class="field-group">
          <label for="register-confirm">Confirm password</label>
          <InputText id="register-confirm" v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required :invalid="Boolean(errors.confirmPassword)" :aria-invalid="Boolean(errors.confirmPassword)" :aria-describedby="errors.confirmPassword ? 'register-confirm-error' : undefined" />
          <small v-if="errors.confirmPassword" id="register-confirm-error" class="field-error">{{ errors.confirmPassword }}</small>
        </div>

        <Message v-if="Object.keys(errors).length" severity="error" :closable="false" class="validation-summary" role="alert">Please correct the highlighted fields.</Message>
        <Message v-if="authenticationError" id="registration-error" severity="error" :closable="false" class="validation-summary" role="alert">{{ authenticationError }}</Message>
        <Button class="primary-button login-button" type="submit" :label="submitting ? 'Creating account…' : form.requestedRole === 'Coordinator' ? 'Create account and apply' : 'Create Volunteer account'" icon="pi pi-user-plus" :disabled="submitting" />
      </form>
      <p class="auth-switch">Already have an account? <RouterLink to="/">Sign in</RouterLink></p>
    </section>
  </main>
</template>
