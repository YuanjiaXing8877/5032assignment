<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import InteractiveTable from './InteractiveTable.vue'
import { activityError, activityStatus, changeActivity, formatActivityTime } from '../services/activities'
const props = defineProps({ activities: { type: Array, required: true }, bookings: { type: Object, required: true }, now: { type: Number, required: true } })
const busy = ref('')
const error = ref('')
const message = ref('')
const columns = [
  { key: 'title', label: 'Activity' }, { key: 'date', label: 'Starts (Melbourne)', value: row => formatActivityTime(row.startAt), sortValue: row => row.startAt },
  { key: 'address', label: 'Meeting point' }, { key: 'suburb', label: 'Suburb' },
  { key: 'availability', label: 'Places', value: row => `${row.capacity - row.bookedCount} available / ${row.capacity}` },
  { key: 'status', label: 'Status', value: row => activityStatus(row, props.now) },
  { key: 'action', label: 'Booking', sortable: false, searchable: false }
]
async function booking(action, id) {
  busy.value = id; error.value = ''; message.value = ''
  try { await changeActivity(action, { activityId: id }); message.value = action === 'book' ? 'Your place is booked.' : 'Your booking has been cancelled.' }
  catch (failure) { error.value = activityError(failure) }
  finally { busy.value = '' }
}
</script>
<template>
  <section id="browse-activities" class="admin-section" aria-labelledby="browse-title">
    <div class="section-heading"><div><p class="eyebrow">Volunteer opportunities</p><h2 id="browse-title">Browse activities</h2></div></div>
    <Message v-if="error" severity="error" :closable="false" role="alert">{{ error }}</Message><Message v-if="message" severity="success" :closable="false" role="status">{{ message }}</Message>
    <InteractiveTable :rows="activities" :columns="columns" label="Available activities">
      <template #title="{ row }"><strong>{{ row.title }}</strong><small class="activity-description">{{ row.description }}</small></template>
      <template #action="{ row }">
        <Button v-if="bookings[row.id]?.status === 'Booked' && (row.startAt > now || row.status === 'Cancelled')" type="button" class="outline-button" label="Cancel booking" outlined :loading="busy === row.id" :disabled="Boolean(busy)" @click="booking('withdraw', row.id)" />
        <span v-else-if="bookings[row.id]?.status === 'Booked'">{{ bookings[row.id].attended ? 'Attended' : 'Booked' }}</span>
        <Button v-else type="button" class="primary-button" label="Book a place" :loading="busy === row.id" :disabled="Boolean(busy) || row.status !== 'Published' || row.startAt <= now || row.bookedCount >= row.capacity" @click="booking('book', row.id)" />
      </template>
    </InteractiveTable>
  </section>
</template>
<style scoped>.activity-description { display: block; min-width: 180px; max-width: 320px; white-space: pre-wrap; margin-top: 6px; color: var(--muted); }</style>
