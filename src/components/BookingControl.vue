<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import { bookingConstraint } from '../utils/calendar'
const props = defineProps({ activity: { type: Object, required: true }, activities: { type: Array, required: true }, bookings: { type: Object, required: true }, now: { type: Number, required: true }, busy: { type: String, default: '' }, prefix: { type: String, default: 'booking-action' } })
const emit = defineEmits(['change'])
const booked = computed(() => props.bookings[props.activity.id]?.status === 'Booked')
const reason = computed(() => bookingConstraint(props.activity, props.activities, props.bookings, props.now))
const buttonId = computed(() => `${props.prefix}-${props.activity.id}`)
function change(action) { emit('change', { action, id: props.activity.id, returnId: buttonId.value }) }
</script>
<template>
  <div class="booking-control">
    <Button v-if="booked && (activity.startAt > now || activity.status === 'Cancelled')" :id="buttonId" type="button" class="outline-button" label="Cancel booking" :aria-label="`Cancel booking for ${activity.title}`" outlined :loading="busy === activity.id" :disabled="Boolean(busy)" @click="change('withdraw')" />
    <span v-else-if="booked" :id="buttonId" tabindex="-1">{{ bookings[activity.id].attended ? 'Attended' : 'Booked' }}</span>
    <Button v-else :id="buttonId" type="button" class="primary-button" label="Book a place" :aria-label="`Book a place for ${activity.title}`" :aria-describedby="reason ? `${buttonId}-reason` : undefined" :loading="busy === activity.id" :disabled="Boolean(busy) || Boolean(reason)" @click="change('book')" />
    <small v-if="!booked && reason" :id="`${buttonId}-reason`" class="booking-reason">{{ reason }}</small>
  </div>
</template>
<style scoped>
.booking-control { min-width: 130px; }
.booking-control :deep(.p-button) { white-space: nowrap; }
.booking-reason { display: block; max-width: 220px; margin-top: 7px; font-size: 12px; color: #674e12; }
</style>
