<script setup>
import { reactive, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { MAX_ATTACHMENT_BYTES, sendEmail } from '../services/email'

const form = reactive({ to: '', subject: '', message: '' })
const files = ref([])
const fileInput = ref(null)
const sending = ref(false)
const error = ref('')
const success = ref('')

function selectFiles(event) {
  error.value = ''
  success.value = ''
  const selected = Array.from(event.target.files || [])
  if (selected.length > 5 || selected.some((file) => !file.size) || selected.reduce((sum, file) => sum + file.size, 0) > MAX_ATTACHMENT_BYTES) {
    error.value = 'Choose one to five non-empty files, totalling 5 MB or less.'
    files.value = []
    event.target.value = ''
    return
  }
  files.value = selected
}

async function submit() {
  if (sending.value) return
  error.value = ''
  success.value = ''
  sending.value = true
  try {
    await sendEmail({ ...form, files: files.value })
    success.value = 'Your email has been accepted for delivery.'
    Object.assign(form, { to: '', subject: '', message: '' })
    files.value = []
    fileInput.value.value = ''
  } catch (failure) {
    const messages = {
      'functions/unauthenticated': 'Please sign in again before sending an email.',
      'functions/not-found': 'Email service is currently unavailable.',
      'functions/internal': 'Email service is currently unavailable.',
      'functions/unavailable': 'Unable to confirm email acceptance. Check your inbox before trying again.'
    }
    error.value = messages[failure.code] || failure.message || 'Unable to send the email. Please try again.'
  } finally { sending.value = false }
}
</script>

<template>
  <main class="admin-page container-xl">
    <section class="welcome-row">
      <div><p class="eyebrow">Member communications</p><h1>Send email</h1><p>Share a message and attachments with your recipient.</p></div>
    </section>
    <section class="admin-section email-panel" aria-label="Compose email">
      <Message v-if="error" severity="error" :closable="false" role="alert">{{ error }}</Message>
      <Message v-if="success" severity="success" :closable="false" role="status">{{ success }}</Message>
      <form @submit.prevent="submit">
        <fieldset :disabled="sending" class="email-fields">
          <div><label for="email-recipient">Recipient email</label><input id="email-recipient" v-model.trim="form.to" class="form-control" type="email" required maxlength="254" autocomplete="email" placeholder="name@example.com" /></div>
          <div><label for="email-subject">Subject</label><input id="email-subject" v-model="form.subject" class="form-control" required maxlength="150" /></div>
          <div><label for="email-message">Message</label><textarea id="email-message" v-model="form.message" class="form-control" required maxlength="10000" rows="7"></textarea></div>
          <div><label for="email-attachments">Attachments</label><input id="email-attachments" ref="fileInput" class="form-control" type="file" multiple required aria-describedby="attachment-hint" @change="selectFiles" /><small id="attachment-hint" class="field-hint">One to five files, up to 5 MB in total.</small>
            <ul v-if="files.length" class="attachment-list"><li v-for="(file, index) in files" :key="index">{{ file.name }} ({{ (file.size / 1024).toFixed(1) }} KB)</li></ul>
          </div>
          <Button class="primary-button" type="submit" :label="sending ? 'Sending…' : 'Send email'" icon="pi pi-send" :loading="sending" />
        </fieldset>
      </form>
    </section>
  </main>
</template>

<style scoped>
.email-panel { max-width: 760px; }
.email-fields { display: grid; gap: 20px; margin-top: 18px; min-width: 0; }
.email-fields label { display: block; margin-bottom: 7px; font-weight: 650; }
.email-fields .form-control { font-size: 14px; }
.email-fields .primary-button { justify-self: start; }
.attachment-list { margin: 10px 0 0; padding-left: 20px; overflow-wrap: anywhere; font-size: 13px; }
</style>
