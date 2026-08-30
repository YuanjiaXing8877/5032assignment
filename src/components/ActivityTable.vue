<script setup>
defineProps({
  activities: {
    type: Array,
    required: true
  }
})
</script>

<template>
  <div class="table-wrap activity-table-wrap">
    <table class="activity-table">
      <caption class="sr-only">Volunteer activity history</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Activity</th>
          <th scope="col">Suburb</th>
          <th scope="col">Status</th>
          <th scope="col">Hours</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="activity in activities" :key="activity.id">
          <td data-label="Date">{{ activity.date }}</td>
          <td data-label="Activity"><strong>{{ activity.activity }}</strong></td>
          <td data-label="Suburb">{{ activity.suburb }}</td>
          <td data-label="Status"><span class="status" :class="activity.status.toLowerCase()">{{ activity.status }}</span></td>
          <td data-label="Hours">{{ activity.hours || '–' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
