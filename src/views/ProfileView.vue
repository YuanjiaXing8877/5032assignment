<script setup>
import { computed } from 'vue'
import ActivityTable from '../components/ActivityTable.vue'
import PersonalInfo from '../components/PersonalInfo.vue'
import SummaryCards from '../components/SummaryCards.vue'
import { profileData } from '../data/profileData'

const summary = computed(() => ({
  activities: profileData.activities.length,
  hours: profileData.activities.reduce((total, activity) => total + activity.hours, 0),
  trees: profileData.activities.reduce((total, activity) => total + activity.trees, 0)
}))

function updateUser(updatedUser) {
  Object.assign(profileData.user, updatedUser)
}
</script>

<template>
  <main id="overview" class="profile-page page-container">
    <aside class="profile-sidebar" aria-label="Profile sections">
      <p class="sidebar-title">My GreenLink</p>
      <a class="active" href="#overview">Overview</a>
      <a href="#personal">Personal information</a>
      <a href="#activity">Activity history</a>
    </aside>

    <div class="profile-content">
      <section class="welcome-row">
        <div>
          <p class="eyebrow">Personal dashboard</p>
          <h1>Welcome back, {{ profileData.user.name.split(' ')[0] }}</h1>
          <p>Review your personal details and volunteering activity.</p>
        </div>
        <div class="avatar" aria-hidden="true">{{ profileData.user.name.charAt(0) }}</div>
      </section>

      <PersonalInfo :user="profileData.user" @save="updateUser" />
      <SummaryCards :summary="summary" />

      <section id="activity" aria-labelledby="activity-title">
        <div class="section-heading activity-heading">
          <div>
            <p class="eyebrow">Participation</p>
            <h2 id="activity-title">Activity history</h2>
          </div>
        </div>
        <ActivityTable :activities="profileData.activities" />
      </section>
    </div>
  </main>
</template>
