<script setup>
import Tag from 'primevue/tag'
import ActivityRating from './ActivityRating.vue'
import InteractiveTable from './InteractiveTable.vue'
defineProps({ activities: { type: Array, required: true } })
const columns = [
  { key: 'date', label: 'Date', sortValue: (row) => row.startAt || Date.parse(row.date) || 0 },
  { key: 'activity', label: 'Activity' },
  { key: 'suburb', label: 'Suburb' },
  { key: 'status', label: 'Status' },
  { key: 'hours', label: 'Hours' },
  { key: 'rating', label: 'Community rating', sortable: false, searchable: false }
]
function statusSeverity(status) {
  if (status === 'Confirmed') return 'success'
  if (status === 'Saved') return 'warn'
  return 'info'
}
</script>
<template>
  <InteractiveTable :rows="activities" :columns="columns" label="Activity history">
    <template #activity="{ row }"><strong>{{ row.activity }}</strong></template>
    <template #status="{ row }"><Tag :value="row.status" :severity="statusSeverity(row.status)" /></template>
    <template #rating="{ row }"><ActivityRating :activity="row" :read-only="row.status !== 'Completed'" /><small v-if="row.status !== 'Completed'" class="rating-unavailable">Rate after attendance and completion</small></template>
  </InteractiveTable>
</template>
