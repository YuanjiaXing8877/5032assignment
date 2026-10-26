<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { collection, onSnapshot } from 'firebase/firestore'
import Button from 'primevue/button'
import Message from 'primevue/message'
import InteractiveTable from './InteractiveTable.vue'
import BulkEmailPanel from './BulkEmailPanel.vue'
import { authState } from '../services/auth'
import { firestore } from '../services/firebase'
import { activityError, activityStatus, changeActivity, formatActivityTime } from '../services/activities'
import { loadMaps, mapError } from '../services/maps'
import { activityTimeInput, parseActivityTime } from '../utils/activityTime'
import { focusTarget } from '../utils/accessibility'

const props = defineProps({ activities: { type: Array, required: true }, now: { type: Number, required: true } })
const owned = computed(() => authState.user ? props.activities.filter(event => authState.user.role === 'Administrator' || event.coordinatorId === authState.user.uid) : [])
const editing = ref(false)
const form = reactive({ id: '', title: '', description: '', suburb: '', address: '', start: '', end: '', capacity: 10, location: null, version: 0 })
const busy = ref(false)
const searching = ref(false)
const addressResults = ref([])
const error = ref('')
const message = ref('')
const cancelId = ref('')
const editorReturn = ref('#create-activity-button')
const participantEventId = ref('')
const participants = ref([])
const loadingParticipants = ref(false)
const participantEvent = computed(() => owned.value.find(event => event.id === participantEventId.value))
const timesLocked = computed(() => Boolean(form.id && owned.value.find(event => event.id === form.id)?.bookedCount > 0))
let stopParticipants = () => {}
let active = true
let addressRevision = 0
const columns = [
  { key: 'number', label: 'No.', sortable: false, searchable: false, exportable: false },
  { key: 'title', label: 'Activity' }, { key: 'start', label: 'Starts (Melbourne)', value: row => formatActivityTime(row.startAt), sortValue: row => row.startAt },
  { key: 'suburb', label: 'Suburb' }, { key: 'places', label: 'Bookings', value: row => `${row.bookedCount} / ${row.capacity}` },
  { key: 'status', label: 'Status', value: row => activityStatus(row, props.now) }, { key: 'action', label: 'Manage', sortable: false, searchable: false }
]
const participantColumns = [
  { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Booking' },
  { key: 'attendance', label: 'Attendance', value: row => row.attended ? 'Attended' : 'Not checked in' },
  { key: 'action', label: 'Check in', sortable: false, searchable: false }
]

watch(() => form.address, () => { form.location = null; addressResults.value = []; addressRevision++ }, { flush: 'sync' })
watch([participantEventId, () => authState.user?.role, () => participantEvent.value?.id], () => {
  stopParticipants(); participants.value = []
  loadingParticipants.value = Boolean(participantEventId.value)
  if (!participantEvent.value) { loadingParticipants.value = false; return }
  stopParticipants = onSnapshot(collection(firestore, 'activities', participantEventId.value, 'registrations'), (snapshot) => {
    participants.value = snapshot.docs.map(item => ({ ...item.data(), id: item.id })); loadingParticipants.value = false
  }, failure => { participants.value = []; loadingParticipants.value = false; error.value = activityError(failure) })
})
onUnmounted(() => { active = false; addressRevision++; stopParticipants() })

function edit(event) {
  editorReturn.value = event ? `#edit-activity-${event.id}` : '#create-activity-button'
  error.value = ''; message.value = ''; addressResults.value = []
  Object.assign(form, event ? { id: event.id, title: event.title, description: event.description, suburb: event.suburb, address: event.address, start: activityTimeInput(event.startAt), end: activityTimeInput(event.endAt), capacity: event.capacity, location: event.location, version: event.version } : { id: '', title: '', description: '', suburb: '', address: '', start: '', end: '', capacity: 10, location: null, version: 0 })
  editing.value = true
  focusTarget('#activity-title-input')
}
function discard() { editing.value = false; focusTarget(editorReturn.value) }
function requestCancellation(event) { cancelId.value = event.id; focusTarget('#keep-activity-button') }
function keepActivity() { const id = cancelId.value; cancelId.value = ''; focusTarget(`#cancel-activity-${id}`) }
function showParticipants(event) { participantEventId.value = event.id; focusTarget('#participants-title') }
function closeParticipants() { const id = participantEventId.value; participantEventId.value = ''; focusTarget(`#participants-${id}`) }

async function searchMeetingPoint() {
  const revision = ++addressRevision
  searching.value = true; error.value = ''; addressResults.value = []
  try {
    const api = await loadMaps()
    const { Geocoder } = await api.importLibrary('geocoding')
    const response = await new Geocoder().geocode({ address: form.address.trim(), componentRestrictions: { country: 'AU' } })
    if (!active || revision !== addressRevision) return
    addressResults.value = response.results.slice(0, 5).map(item => ({ id: item.place_id, label: item.formatted_address, location: item.geometry.location.toJSON() }))
    if (!addressResults.value.length) error.value = 'No meeting addresses found. Enter a more specific address.'
  } catch (failure) { if (active && revision === addressRevision) error.value = mapError(failure) }
  finally { if (active) searching.value = false }
}

function chooseAddress(item) { form.address = item.label; form.location = item.location; addressResults.value = []; focusTarget('#activity-address') }

async function save() {
  if (busy.value || searching.value) return
  error.value = ''; message.value = ''
  if (!form.location) { error.value = 'Search for and select the meeting address before publishing.'; focusTarget('#activity-address'); return }
  busy.value = true
  try {
    const lockedSchedule = timesLocked.value ? owned.value.find(event => event.id === form.id) : null
    const response = await changeActivity('save', {
      ...(form.id ? { activityId: form.id, version: form.version } : {}),
      data: { title: form.title, description: form.description, suburb: form.suburb, address: form.address, capacity: form.capacity, location: form.location, startAt: lockedSchedule?.startAt ?? parseActivityTime(form.start), endAt: lockedSchedule?.endAt ?? parseActivityTime(form.end) }
    })
    editing.value = false; message.value = form.id ? 'Activity updated.' : 'Your activity is published and available to volunteers.'
    participantEventId.value = response.id
    focusTarget('#create-activity-button')
  } catch (failure) { error.value = activityError(failure); focusTarget('#coordinator-error') }
  finally { busy.value = false }
}

async function cancelActivity() {
  busy.value = true; error.value = ''; message.value = ''
  try { await changeActivity('cancel', { activityId: cancelId.value }); cancelId.value = ''; message.value = 'Activity cancelled. Participants can see the cancellation in their account.'; focusTarget('#create-activity-button') }
  catch (failure) { error.value = activityError(failure) }
  finally { busy.value = false }
}

async function attendance(participant) {
  busy.value = true; error.value = ''; message.value = ''
  try { await changeActivity('attendance', { activityId: participantEventId.value, participantId: participant.id, attended: !participant.attended }); message.value = 'Attendance updated.' }
  catch (failure) { error.value = activityError(failure) }
  finally { busy.value = false }
}
</script>

<template>
  <section id="coordinator-tools" class="admin-section" aria-labelledby="coordinator-tools-title">
    <div class="section-heading"><div><p class="eyebrow">{{ authState.user.role }} tools</p><h2 id="coordinator-tools-title">Manage your activities</h2></div><Button id="create-activity-button" type="button" class="primary-button" label="Create activity" icon="pi pi-plus" :disabled="busy" @click="edit(null)" /></div>
    <p>You can continue volunteering while organising activities. Published activities appear in the activity list and map.</p>
    <Message v-if="error" id="coordinator-error" severity="error" :closable="false" role="alert">{{ error }}</Message><Message v-if="message" severity="success" :closable="false" role="status">{{ message }}</Message>
    <form v-if="editing" class="activity-editor" @submit.prevent="save" :aria-busy="busy">
      <h3>{{ form.id ? 'Edit activity' : 'New activity' }}</h3>
      <fieldset :disabled="busy"><legend class="sr-only">Activity details</legend><div class="row g-3">
        <div class="col-12"><label for="activity-title-input">Activity title</label><input id="activity-title-input" v-model.trim="form.title" class="form-control" required minlength="3" maxlength="120" /></div>
        <div class="col-12"><label for="activity-description">Description</label><textarea id="activity-description" v-model.trim="form.description" class="form-control" rows="3" required minlength="10" maxlength="3000"></textarea></div>
        <div class="col-12 col-md-6"><label for="activity-start">Start (Melbourne time)</label><input id="activity-start" v-model="form.start" class="form-control" type="datetime-local" required :disabled="timesLocked" :aria-describedby="timesLocked ? 'activity-time-lock' : undefined" /></div>
        <div class="col-12 col-md-6"><label for="activity-end">End (Melbourne time)</label><input id="activity-end" v-model="form.end" class="form-control" type="datetime-local" required :disabled="timesLocked" :aria-describedby="timesLocked ? 'activity-time-lock' : undefined" /></div>
        <p v-if="timesLocked" id="activity-time-lock" class="field-hint col-12">Start and end times are locked while participants are booked. To change the schedule, cancel this activity and publish a new time, or wait until all bookings are withdrawn.</p>
        <div class="col-12 col-md-6"><label for="activity-suburb">Suburb</label><input id="activity-suburb" v-model.trim="form.suburb" class="form-control" required maxlength="80" /></div>
        <div class="col-12 col-md-6"><label for="activity-capacity">Maximum participants</label><input id="activity-capacity" v-model.number="form.capacity" class="form-control" type="number" min="1" max="500" step="1" required /></div>
        <div class="col-12"><label for="activity-address">Meeting address</label><div class="meeting-search"><input id="activity-address" v-model="form.address" class="form-control" required maxlength="250" placeholder="Street address, suburb, Victoria" aria-describedby="activity-address-help" :disabled="searching" /><Button type="button" class="outline-button" label="Find address" outlined :loading="searching" :disabled="searching || !form.address.trim()" @click="searchMeetingPoint" /></div><small id="activity-address-help" class="field-hint">Search and select the exact meeting address. Address searches are sent to Google.</small>
          <ul v-if="addressResults.length" class="meeting-results" aria-label="Choose meeting address"><li v-for="item in addressResults" :key="item.id"><button type="button" @click="chooseAddress(item)">{{ item.label }}</button></li></ul><p v-if="form.location" class="verified-meeting" role="status">Meeting point selected: {{ form.address }}</p>
        </div>
      </div><div class="editor-actions"><Button type="button" class="outline-button" label="Discard changes" outlined @click="discard" /><Button type="submit" class="primary-button" :label="form.id ? 'Save changes' : 'Publish activity'" :loading="busy" :disabled="searching" /></div></fieldset>
    </form>
    <div v-if="cancelId" class="cancel-confirm" role="group" aria-label="Confirm activity cancellation"><p>Cancel this activity? New bookings will close and existing participants will see it as cancelled.</p><Button id="keep-activity-button" type="button" class="outline-button" label="Keep activity" outlined :disabled="busy" @click="keepActivity" /><Button type="button" class="primary-button" label="Confirm cancellation" :loading="busy" :disabled="busy" @click="cancelActivity" /></div>
    <InteractiveTable :rows="owned" :columns="columns" label="Managed activities">
      <template #number="{ number }">{{ number }}</template>
      <template #action="{ row }"><div class="manage-buttons"><Button :id="`edit-activity-${row.id}`" type="button" class="outline-button" label="Edit" :aria-label="`Edit ${row.title}`" outlined :disabled="busy || row.status !== 'Published' || row.startAt <= now" @click="edit(row)" /><Button :id="`participants-${row.id}`" type="button" class="outline-button" label="Participants & email" :aria-label="`Participants and email for ${row.title}`" outlined :disabled="busy" @click="showParticipants(row)" /><Button :id="`cancel-activity-${row.id}`" type="button" class="outline-button" label="Cancel activity" :aria-label="`Cancel activity: ${row.title}`" outlined :disabled="busy || row.status !== 'Published' || row.startAt <= now" @click="requestCancellation(row)" /></div></template>
    </InteractiveTable>
    <section v-if="participantEvent" class="participant-panel" aria-labelledby="participants-title"><div class="section-heading"><h3 id="participants-title">Participants: {{ participantEvent.title }}</h3><Button type="button" label="Close list" class="outline-button" outlined @click="closeParticipants" /></div><p>Attendance can be recorded once the activity has started. Volunteer hours are counted after the activity ends.</p><p v-if="loadingParticipants" role="status">Loading participants…</p><InteractiveTable v-else :rows="participants" :columns="participantColumns" label="Activity participants"><template #action="{ row }"><Button type="button" class="outline-button" :label="row.attended ? 'Undo check-in' : 'Check in'" :aria-label="`${row.attended ? 'Undo check-in for' : 'Check in'} ${row.name}`" outlined :disabled="busy || row.status !== 'Booked' || participantEvent.status !== 'Published' || participantEvent.startAt > now" @click="attendance(row)" /></template></InteractiveTable><BulkEmailPanel :key="participantEvent.id" :activity="participantEvent" :participants="participants" :loading="loadingParticipants" /></section>
  </section>
</template>

<style scoped>
.activity-editor, .participant-panel, .cancel-confirm { margin: 20px 0; padding: 18px; background: #f5f4f1; border: 1px solid var(--line); border-radius: 4px; }
h3 { font-size: 18px; }
label { display: block; font-size: 13px; font-weight: 650; margin-bottom: 6px; }
.meeting-search, .editor-actions, .manage-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.meeting-search input { flex: 1 1 200px; min-width: 0; }
.editor-actions { justify-content: flex-end; margin-top: 20px; }
.meeting-results { padding-left: 0; list-style: none; margin: 10px 0; }
.meeting-results button { padding: 10px; width: 100%; text-align: left; color: var(--accent-strong); background: white; border: 1px solid var(--line); }
.verified-meeting { color: var(--accent); font-size: 13px; margin-top: 8px; }
.cancel-confirm .p-button { margin-right: 8px; }
.manage-buttons { min-width: 185px; }
</style>
