<script setup>
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import ActivityRating from './ActivityRating.vue'

defineProps({
  activities: {
    type: Array,
    required: true
  }
})

function statusSeverity(status) {
  if (status === 'Confirmed') return 'success'
  if (status === 'Saved') return 'warn'
  return 'info'
}
</script>

<template>
  <div class="desktop-data-table d-none d-sm-block" aria-label="Volunteer activity history">
    <DataTable
      :value="activities"
      data-key="id"
      class="activity-data-table"
      striped-rows
      removable-sort
      table-style="min-width: 60rem"
    >
      <Column field="date" header="Date" sortable />
      <Column field="activity" header="Activity" sortable>
        <template #body="slotProps">
          <strong>{{ slotProps.data.activity }}</strong>
        </template>
      </Column>
      <Column field="suburb" header="Suburb" sortable />
      <Column field="status" header="Status" sortable>
        <template #body="slotProps">
          <Tag :value="slotProps.data.status" :severity="statusSeverity(slotProps.data.status)" />
        </template>
      </Column>
      <Column field="hours" header="Hours" sortable>
        <template #body="slotProps">
          {{ slotProps.data.hours || '–' }}
        </template>
      </Column>
      <Column header="Community rating">
        <template #body="slotProps">
          <ActivityRating v-if="slotProps.data.status === 'Completed'" :activity="slotProps.data" />
          <span v-else class="rating-unavailable">Available after attendance</span>
        </template>
      </Column>
    </DataTable>
  </div>

  <div class="mobile-activity-list d-grid d-sm-none" aria-label="Volunteer activity history">
    <article v-for="activity in activities" :key="activity.id" class="mobile-activity-card">
      <dl>
        <div><dt>Date</dt><dd>{{ activity.date }}</dd></div>
        <div><dt>Activity</dt><dd><strong>{{ activity.activity }}</strong></dd></div>
        <div><dt>Suburb</dt><dd>{{ activity.suburb }}</dd></div>
        <div><dt>Status</dt><dd><Tag :value="activity.status" :severity="statusSeverity(activity.status)" /></dd></div>
        <div><dt>Hours</dt><dd>{{ activity.hours || '–' }}</dd></div>
        <div><dt>Rating</dt><dd><ActivityRating v-if="activity.status === 'Completed'" :activity="activity" /><span v-else class="rating-unavailable">Available after attendance</span></dd></div>
      </dl>
    </article>
  </div>
</template>
