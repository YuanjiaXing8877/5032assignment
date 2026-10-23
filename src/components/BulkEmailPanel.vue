<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import InteractiveTable from './InteractiveTable.vue'
import { authState } from '../services/auth'
import { firestore } from '../services/firebase'
import { encodeFile, sendBulkEmail, validateAttachments } from '../services/email'
import { focusTarget } from '../utils/accessibility'

const props = defineProps({ activity: { type: Object, required: true }, participants: { type: Array, required: true }, loading: Boolean })
const form = reactive({ subject: '', message: '' })
const files = ref([])
const fileInput = ref(null)
const selectedIds = ref([])
const preparing = ref(false)
const sending = ref(false)
const draft = ref(null)
const result = ref(null)
const error = ref('')
const recordsError = ref('')
const records = ref([])
const expanded = ref('')
const now = ref(Date.now())
const eligible = computed(() => props.participants.filter(person => person.status === 'Booked' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(person.email || '')))
const selected = computed(() => eligible.value.filter(person => selectedIds.value.includes(person.id)))
const uniqueCount = computed(() => new Set(selected.value.map(person => person.email.trim().toLowerCase())).size)
const locked = computed(() => preparing.value || sending.value || Boolean(result.value))
const visibleStatus = row => row.status === 'Sending' && now.value - row.createdAt > 90000 ? 'Unconfirmed' : row.status
const formatDate = value => new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'medium', timeStyle: 'short' }).format(value)
const recipientColumns = [{ key: 'select', label: 'Select', sortable: false, searchable: false }, { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }]
const recordColumns = [
  { key: 'createdAt', label: 'Started (Melbourne)', value: row => formatDate(row.createdAt), sortValue: row => row.createdAt },
  { key: 'subject', label: 'Subject' }, { key: 'recipientCount', label: 'Addresses' },
  { key: 'status', label: 'Result', value: visibleStatus }, { key: 'action', label: 'Details', sortable: false, searchable: false }
]
const selectedRecord = computed(() => records.value.find(row => row.id === expanded.value))
const submitted = computed(() => records.value.find(row => row.id === result.value?.batchId) || result.value)
let active = true
let stopRecords = () => {}
const timer = setInterval(() => { now.value = Date.now() }, 30000)

watch(() => eligible.value.map(person => `${person.id}:${person.email}`).join('|'), () => {
  selectedIds.value = selectedIds.value.filter(id => eligible.value.some(person => person.id === id))
  if (!sending.value && !result.value) draft.value = null
})
watch([() => form.subject, () => form.message, selectedIds, files], () => { if (!sending.value && !result.value) draft.value = null }, { deep: true })
watch(() => [props.activity.id, authState.user?.uid, authState.user?.role], () => {
  stopRecords(); records.value = []; recordsError.value = ''
  if (!authState.user || !['Coordinator', 'Administrator'].includes(authState.user.role)) return
  stopRecords = onSnapshot(query(collection(firestore, 'activities', props.activity.id, 'emailBatches'), orderBy('createdAt', 'desc'), limit(20)), snapshot => {
    records.value = snapshot.docs.map(item => ({ ...item.data(), id: item.id }))
  }, () => { recordsError.value = 'Unable to load sending records. Refresh the page before starting another batch.' })
}, { immediate: true })
onUnmounted(() => { active = false; stopRecords(); clearInterval(timer) })

function selectFiles(event) {
  error.value = ''
  const next = Array.from(event.target.files || [])
  try { validateAttachments(next, false); files.value = next }
  catch (failure) { error.value = failure.message; files.value = []; event.target.value = ''; focusTarget('#bulk-email-error') }
}
async function prepare() {
  if (locked.value || props.loading) return
  error.value = ''
  if (!selected.value.length || selected.value.length > 50) { error.value = 'Select between 1 and 50 booked participants.'; focusTarget('#bulk-email-error'); return }
  if (!form.subject.trim() || !form.message.trim()) { error.value = 'Enter a subject and message before previewing.'; focusTarget('#bulk-email-error'); return }
  const selection = selected.value.map(person => ({ id: person.id, name: person.name, email: person.email }))
  preparing.value = true
  try {
    validateAttachments(files.value, false)
    const attachments = await Promise.all(files.value.map(encodeFile))
    if (!active) return
    if (JSON.stringify(selection) !== JSON.stringify(selected.value.map(person => ({ id: person.id, name: person.name, email: person.email })))) throw new Error('The participant list changed. Review your selection and preview again.')
    draft.value = {
      payload: { activityId: props.activity.id, requestId: crypto.randomUUID(), participantIds: selected.value.map(person => person.id), subject: form.subject.trim(), message: form.message, attachments },
      recipients: selection,
      files: files.value.map(file => ({ name: file.name, size: file.size })), count: uniqueCount.value
    }
    focusTarget('#bulk-preview-title')
  } catch (failure) { error.value = failure.message; focusTarget('#bulk-email-error') }
  finally { preparing.value = false }
}
async function confirmSend() {
  if (sending.value || !draft.value || result.value) return
  sending.value = true; error.value = ''
  try {
    const response = await sendBulkEmail(draft.value.payload)
    if (active) { result.value = response; focusTarget('#bulk-email-result') }
  } catch (failure) {
    if (!active) return
    const code = failure.code || ''
    error.value = ['functions/unavailable', 'functions/deadline-exceeded', 'functions/internal'].includes(code)
      ? 'The result could not be confirmed. Check the records below. Retrying this same request will not submit an existing batch twice.'
      : failure.message || 'Unable to submit this batch.'
    focusTarget('#bulk-email-error')
  } finally { sending.value = false }
}
function newMessage() {
  result.value = null; draft.value = null; error.value = ''; selectedIds.value = []; files.value = []
  Object.assign(form, { subject: '', message: '' })
  if (fileInput.value) fileInput.value.value = ''
  focusTarget('#bulk-subject')
}
function editDraft() { draft.value = null; error.value = ''; focusTarget('#bulk-subject') }
</script>

<template>
  <section class="bulk-email-panel" aria-labelledby="bulk-email-title">
    <h3 id="bulk-email-title">Email activity participants</h3>
    <p>Send an activity update to selected booked participants. Each email address receives a separate copy; recipients cannot see other recipients.</p>
    <p class="field-hint">Up to 50 participants per batch and 100 recipient addresses per UTC day, with one minute between batches. Duplicate addresses receive one copy. Provider sending limits also apply.</p>
    <p v-if="error" id="bulk-email-error" class="field-error" role="alert">{{ error }}</p>
    <div v-if="result" id="bulk-email-result" class="bulk-result" role="status" aria-live="polite">
      <strong>{{ visibleStatus(submitted) }} · {{ submitted.recipientCount }} email {{ submitted.recipientCount === 1 ? 'address' : 'addresses' }}</strong>
      <p>{{ submitted.status === 'Accepted' ? 'The email service accepted this batch. Inbox delivery is not confirmed. Check SendGrid activity for delivery or blocking details.' : submitted.status === 'Rejected' ? 'The email service rejected this batch. Read the sending record below before preparing another email.' : 'Check the sending record below. This request will not be resent automatically. If its result remains unconfirmed, check SendGrid activity before preparing another email.' }}</p>
      <button type="button" class="bulk-button" @click="newMessage">Compose another email</button>
    </div>
    <form v-show="!draft && !result" @submit.prevent="prepare" :aria-busy="preparing">
      <fieldset :disabled="locked || loading"><legend>Select recipients and compose</legend>
        <div class="bulk-actions"><button class="bulk-button" type="button" :disabled="!eligible.length" @click="selectedIds = eligible.slice(0, 50).map(person => person.id)">Select first {{ Math.min(eligible.length, 50) }} participants</button><button type="button" class="bulk-button" :disabled="!selectedIds.length" @click="selectedIds = []">Clear selection</button><span role="status">{{ selected.length }} selected · {{ uniqueCount }} email addresses</span></div>
        <p v-if="loading" role="status">Loading recipients…</p>
        <InteractiveTable v-else :rows="eligible" :columns="recipientColumns" label="Email recipients">
          <template #select="{ row }"><input v-model="selectedIds" type="checkbox" :value="row.id" :aria-label="`Email ${row.name || row.email}`" :disabled="locked || (selectedIds.length >= 50 && !selectedIds.includes(row.id))" /></template>
        </InteractiveTable>
        <p v-if="!eligible.length && !loading">No booked participants with an email address are available for this activity.</p>
        <div class="bulk-field"><label for="bulk-subject">Subject</label><input id="bulk-subject" v-model="form.subject" class="form-control" required maxlength="150" /></div>
        <div class="bulk-field"><label for="bulk-message">Message</label><textarea id="bulk-message" v-model="form.message" class="form-control" required maxlength="10000" rows="6"></textarea></div>
        <div class="bulk-field"><label for="bulk-files">Attachments (optional)</label><input id="bulk-files" ref="fileInput" class="form-control" type="file" multiple aria-describedby="bulk-files-help" @change="selectFiles" /><small id="bulk-files-help" class="field-hint">Up to five non-empty files, 5 MB combined.</small><ul v-if="files.length"><li v-for="(file, index) in files" :key="index">{{ file.name }} ({{ (file.size / 1024).toFixed(1) }} KB)</li></ul></div>
        <button type="submit" class="bulk-button bulk-primary" :disabled="!selected.length || preparing || Boolean(recordsError)">{{ preparing ? 'Preparing…' : 'Preview email' }}</button>
      </fieldset>
    </form>
    <section v-if="draft && !result" class="bulk-preview" aria-labelledby="bulk-preview-title" :aria-busy="sending">
      <h4 id="bulk-preview-title">Preview activity email</h4>
      <p><strong>Activity:</strong> {{ activity.title }}</p><p><strong>Subject:</strong> {{ draft.payload.subject }}</p>
      <p>{{ draft.count }} separate email {{ draft.count === 1 ? 'copy' : 'copies' }} will be submitted. Selected participants must still have a booking when sending starts.</p>
      <details><summary>Review selected recipients ({{ draft.recipients.length }})</summary><ul><li v-for="person in draft.recipients" :key="person.id">{{ person.name }} — {{ person.email }}</li></ul></details>
      <div class="bulk-message">{{ draft.payload.message }}</div>
      <ul v-if="draft.files.length"><li v-for="(file, index) in draft.files" :key="index">{{ file.name }} ({{ (file.size / 1024).toFixed(1) }} KB)</li></ul><p v-else>No attachments.</p>
      <div class="bulk-actions"><button type="button" class="bulk-button" :disabled="sending" @click="editDraft">Edit email</button><button type="button" class="bulk-button bulk-primary" :disabled="sending" @click="confirmSend">{{ sending ? 'Submitting…' : error ? 'Retry same request' : `Send to ${draft.count} ${draft.count === 1 ? 'address' : 'addresses'}` }}</button></div>
    </section>
    <section class="bulk-history" aria-labelledby="bulk-history-title">
      <h4 id="bulk-history-title">Recent sending records</h4>
      <p>Latest 20 batches for this activity. “Accepted” means accepted by the email service, not delivered to an inbox. Unconfirmed requests are never resent automatically.</p>
      <p v-if="recordsError" class="field-error" role="alert">{{ recordsError }}</p>
      <InteractiveTable :rows="records" :columns="recordColumns" label="Bulk email history">
        <template #action="{ row }"><button type="button" class="bulk-button" :aria-expanded="expanded === row.id" :aria-label="`View sending record for ${row.subject}`" @click="expanded = expanded === row.id ? '' : row.id">{{ expanded === row.id ? 'Hide' : 'View' }}</button></template>
      </InteractiveTable>
      <div v-if="selectedRecord" class="bulk-record" role="region" aria-label="Sending record details">
        <h5>{{ selectedRecord.subject }}</h5><p><strong>{{ visibleStatus(selectedRecord) }}</strong> · {{ formatDate(selectedRecord.createdAt) }} (Melbourne)</p>
        <p>{{ visibleStatus(selectedRecord) === 'Unconfirmed' ? 'Check SendGrid activity before sending again. The outcome of this batch is not confirmed.' : selectedRecord.detail }}</p>
        <ul><li v-for="person in selectedRecord.recipients" :key="person.id">{{ person.name }} — {{ person.email }}</li></ul>
        <p v-if="!selectedRecord.attachments.length">No attachments.</p><ul v-else><li v-for="(file, index) in selectedRecord.attachments" :key="index">{{ file.filename }} ({{ (file.bytes / 1024).toFixed(1) }} KB)</li></ul>
      </div>
    </section>
  </section>
</template>

<style scoped>
.bulk-email-panel { margin-top: 28px; padding-top: 22px; border-top: 1px solid var(--line); min-width: 0; }
h3 { font-size: 19px; } h4 { font-size: 17px; } h5 { font-size: 15px; }
p, li, summary { font-size: 13px; overflow-wrap: anywhere; }
fieldset { min-width: 0; } legend { font-size: 15px; font-weight: 650; }
.bulk-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 14px 0; font-size: 13px; }
.bulk-field { margin: 18px 0; } label { display: block; font-size: 13px; font-weight: 650; margin-bottom: 6px; }
.bulk-button { padding: 9px 12px; border: 1px solid var(--accent); border-radius: 4px; background: white; color: var(--accent); font: inherit; font-size: 13px; }
.bulk-primary { color: white; background: var(--accent); }
.bulk-button:disabled { opacity: .5; cursor: default; }
.bulk-button:focus-visible, summary:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
input[type='checkbox'] { width: 19px; height: 19px; accent-color: var(--accent); }
.bulk-preview, .bulk-result, .bulk-record { padding: 16px; border: 1px solid var(--line); border-radius: 4px; background: white; margin: 18px 0; }
.bulk-message { white-space: pre-wrap; overflow-wrap: anywhere; margin: 18px 0; font-size: 14px; }
.bulk-history { margin-top: 28px; }
.bulk-history :deep(th:last-child), .bulk-history :deep(td:last-child) { min-width: 84px; white-space: nowrap; }
.bulk-history .bulk-button { white-space: nowrap; }
ul { padding-left: 22px; }
</style>
