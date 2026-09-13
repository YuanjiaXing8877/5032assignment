<script setup>
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { profileData } from '../data/profileData'
import { authErrorMessage, register } from '../services/auth'

const router = useRouter()
const showPassword = ref(false)
const submitting = ref(false)
const authenticationError = ref('')
const form = reactive({ name: '', email: '', password: '', confirmPassword: '', requestedRole: 'Volunteer' })
const errors = reactive({})

function validate() {
  Object.keys(errors).forEach((key) => delete errors[key])
  if (form.name.trim().length < 2) errors.name = 'Enter your full name.'
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address.'
  if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9\s]/.test(form.password) || /\s/.test(form.password)) {
    errors.password = 'Use at least 8 characters with an uppercase letter, number and special character, and no spaces.'
  }
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.'
  return Object.keys(errors).length === 0
}

async function submitRegistration() {
  if (!validate()) return
  submitting.value = true
  authenticationError.value = ''
  try {
    const user = await register(form)
    Object.assign(profileData.user, { name: user.name, email: user.email, role: user.role })
    router.replace('/profile')
  } catch (error) {
    authenticationError.value = authErrorMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="auth-page container-xl">
    <section class="auth-card" aria-labelledby="register-title">
      <p class="eyebrow">Join GreenLink</p>
      <h1 id="register-title">Create your account</h1>
      <p class="form-help">Create a Volunteer account or request Coordinator access. Staff access requires administrator approval.</p>

      <form @submit.prevent="submitRegistration" novalidate>
        <div class="field-group">
          <label for="register-name">Full name</label>
          <InputText id="register-name" v-model.trim="form.name" autocomplete="name" maxlength="80" :invalid="Boolean(errors.name)" />
          <small v-if="errors.name" class="field-error" role="alert">{{ errors.name }}</small>
        </div>
        <div class="field-group">
          <label for="register-email">Email address</label>
          <InputText id="register-email" v-model.trim="form.email" type="email" autocomplete="email" maxlength="120" :invalid="Boolean(errors.email)" />
          <small v-if="errors.email" class="field-error" role="alert">{{ errors.email }}</small>
        </div>
        <div class="field-group">
          <label for="requested-role">How would you like to participate?</label>
          <select id="requested-role" v-model="form.requestedRole" class="form-select profile-select">
            <option value="Volunteer">Volunteer</option>
            <option value="Coordinator">Apply to be a Coordinator</option>
          </select>
          <small class="field-hint">Coordinator requests remain Volunteer accounts until an administrator approves them.</small>
        </div>
        <div class="field-group">
          <label for="register-password">Password</label>
          <div class="password-field">
            <InputText id="register-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" :invalid="Boolean(errors.password)" />
            <Button class="password-toggle" type="button" :label="showPassword ? 'Hide' : 'Show'" text @click="showPassword = !showPassword" />
          </div>
          <small v-if="errors.password" class="field-error" role="alert">{{ errors.password }}</small>
        </div>
        <div class="field-group">
          <label for="register-confirm">Confirm password</label>
          <InputText id="register-confirm" v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" :invalid="Boolean(errors.confirmPassword)" />
          <small v-if="errors.confirmPassword" class="field-error" role="alert">{{ errors.confirmPassword }}</small>
        </div>

        <Message v-if="authenticationError" severity="error" :closable="false" class="validation-summary" role="alert">{{ authenticationError }}</Message>
        <Button class="primary-button login-button" type="submit" :label="submitting ? 'Creating account…' : form.requestedRole === 'Coordinator' ? 'Create account and apply' : 'Create Volunteer account'" icon="pi pi-user-plus" :disabled="submitting" />
      </form>
      <p class="auth-switch">Already have an account? <RouterLink to="/">Sign in</RouterLink></p>
    </section>
  </main>
</template>
