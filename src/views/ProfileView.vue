<script setup>
import { computed } from 'vue'
import ActivityTable from '../components/ActivityTable.vue'
import PersonalInfo from '../components/PersonalInfo.vue'
import SummaryCards from '../components/SummaryCards.vue'
import { profileData } from '../data/profileData'
import { authState } from '../services/auth'

Object.assign(profileData.user, {
  name: authState.user.name,
  email: authState.user.email,
  role: authState.user.role
})

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
  <main id="overview" class="profile-page container-xl">
    <div class="row g-3 g-lg-4">
    <aside class="profile-sidebar-column col-12 col-lg-3" aria-label="Profile sections">
      <div class="profile-sidebar">
        <p class="sidebar-title">My GreenLink</p>
        <nav class="profile-sidebar-nav nav nav-pills flex-row flex-lg-column flex-nowrap overflow-auto">
          <a class="nav-link active" href="#overview">Overview</a>
          <a class="nav-link" href="#personal">Personal information</a>
          <a class="nav-link" href="#activity">Activity history</a>
        </nav>
      </div>
    </aside>

    <div class="profile-content col-12 col-lg-9">
      <section class="welcome-row">
        <div>
          <p class="eyebrow">{{ authState.user.role }} account</p>
          <h1>My GreenLink</h1>
          <p>Welcome back, {{ profileData.user.name.split(' ')[0] }}. Review your details and activity below.</p>
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
    </div>
  </main>
</template>
