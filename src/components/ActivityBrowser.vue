<script setup>
import { ref, watch } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import InteractiveTable from './InteractiveTable.vue'
import ActivityRating from './ActivityRating.vue'
import { focusTarget } from '../utils/accessibility'
import { activityError, activityStatus, changeActivity, formatActivityTime } from '../services/activities'
const props = defineProps({ activities: { type: Array, required: true }, bookings: { type: Object, required: true }, now: { type: Number, required: true } })
const busy = ref('')
const error = ref('')
const message = ref('')
let actionFocus = null
watch(() => [props.bookings, busy.value], () => {
  if (actionFocus && !busy.value && props.bookings[actionFocus.id]?.status === actionFocus.status) {
    focusTarget(`#booking-action-${actionFocus.id}`)
    actionFocus = null
  }
})
const columns = [
  { key: 'title', label: 'Activity' }, { key: 'date', label: 'Starts (Melbourne)', value: row => formatActivityTime(row.startAt), sortValue: row => row.startAt },
  { key: 'address', label: 'Meeting point' }, { key: 'suburb', label: 'Suburb' },
  { key: 'availability', label: 'Places', value: row => `${row.capacity - row.bookedCount} available / ${row.capacity}` },
  { key: 'status', label: 'Status', value: row => activityStatus(row, props.now) },
  { key: 'rating', label: 'Community rating', sortable: false, searchable: false, exportable: false },
  { key: 'action', label: 'Booking', sortable: false, searchable: false, exportable: false }
]
async function booking(action, id) {
  actionFocus = { id, status: action === 'book' ? 'Booked' : 'Cancelled' }
  busy.value = id; error.value = ''; message.value = ''
  try { await changeActivity(action, { activityId: id }); message.value = action === 'book' ? 'Your place is booked.' : 'Your booking has been cancelled.' }
  catch (failure) { actionFocus = null; error.value = activityError(failure); focusTarget('#booking-error') }
  finally { busy.value = '' }
}
</script>
<template>
  <section id="browse-activities" class="admin-section" aria-labelledby="browse-title">
    <div class="section-heading"><div><p class="eyebrow">Volunteer opportunities</p><h2 id="browse-title">Browse activities</h2></div></div>
    <p>Choose an activity and book a place. Your booking will appear in Activity history below. Ratings open after attendance and completion.</p>
    <Message v-if="error" id="booking-error" severity="error" :closable="false" role="alert">{{ error }}</Message><Message v-if="message" severity="success" :closable="false" role="status">{{ message }}</Message>
    <InteractiveTable :rows="activities" :columns="columns" label="Available activities" exportable>
      <template #title="{ row }"><strong>{{ row.title }}</strong><details class="activity-details"><summary>Details</summary><small class="activity-description">{{ row.description }}</small></details></template>
      <template #rating="{ row }"><ActivityRating :activity="{ ...row, activity: row.title }" read-only /></template>
      <template #action="{ row }">
        <Button v-if="bookings[row.id]?.status === 'Booked' && (row.startAt > now || row.status === 'Cancelled')" :id="`booking-action-${row.id}`" type="button" class="outline-button" label="Cancel booking" :aria-label="`Cancel booking for ${row.title}`" outlined :loading="busy === row.id" :disabled="Boolean(busy)" @click="booking('withdraw', row.id)" />
        <span v-else-if="bookings[row.id]?.status === 'Booked'" :id="`booking-action-${row.id}`" tabindex="-1">{{ bookings[row.id].attended ? 'Attended' : 'Booked' }}</span>
        <Button v-else :id="`booking-action-${row.id}`" type="button" class="primary-button" label="Book a place" :aria-label="`Book a place for ${row.title}`" :loading="busy === row.id" :disabled="Boolean(busy) || row.status !== 'Published' || row.startAt <= now || row.bookedCount >= row.capacity" @click="booking('book', row.id)" />
      </template>
    </InteractiveTable>
  </section>
</template>
<style scoped>
.activity-details { margin-top: 6px; min-width: 155px; max-width: 280px; }
.activity-details summary { cursor: pointer; color: var(--accent); font-size: 12px; }
.activity-description { display: block; white-space: pre-wrap; margin-top: 6px; color: var(--muted); }
:deep(td .p-button) { white-space: nowrap; }
</style>
