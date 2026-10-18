<script setup>
import { computed, watch } from 'vue'
import ActivityTable from '../components/ActivityTable.vue'
import PersonalInfo from '../components/PersonalInfo.vue'
import SummaryCards from '../components/SummaryCards.vue'
import { profileData } from '../data/profileData'
import { authState } from '../services/auth'
import { useActivities } from '../services/activities'
import CoordinatorApplication from '../components/CoordinatorApplication.vue'
import CoordinatorPanel from '../components/CoordinatorPanel.vue'
import ActivityBrowser from '../components/ActivityBrowser.vue'

const { activities, history, bookings, loading, error, now } = useActivities()
watch(() => authState.user, (user) => {
  if (user) Object.assign(profileData.user, { name: user.name, email: user.email, role: user.role })
}, { immediate: true })

const summary = computed(() => ({
  activities: history.value.filter(row => row.status !== 'Cancelled').length,
  hours: history.value.reduce((total, activity) => total + activity.hours, 0),
  trees: history.value.reduce((total, activity) => total + activity.trees, 0)
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
          <a class="nav-link" href="#browse-activities">Browse activities</a>
          <a class="nav-link" href="#activity">Activity history</a>
          <a v-if="authState.user.role !== 'Volunteer'" class="nav-link" href="#coordinator-tools">Coordinator tools</a>
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
        <div><span class="role-badge">{{ authState.user.role }}</span><div class="avatar mt-2" aria-hidden="true">{{ profileData.user.name.charAt(0) }}</div></div>
      </section>

      <div v-if="authState.user.approvalStatus === 'Pending'" class="pending-role-note" role="status">
        <i class="pi pi-clock" aria-hidden="true"></i>
        Your Coordinator application is awaiting administrator approval. You currently have Volunteer access.
      </div>

      <PersonalInfo :user="profileData.user" @save="updateUser" />
      <CoordinatorApplication />
      <CoordinatorPanel v-if="['Coordinator', 'Administrator'].includes(authState.user.role)" :activities="activities" :now="now" />
      <SummaryCards :summary="summary" />
      <p v-if="loading" role="status">Loading activities…</p>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      <ActivityBrowser :activities="activities.filter(row => row.endAt > now || bookings[row.id]?.status === 'Booked')" :bookings="bookings" :now="now" />

      <section id="activity" aria-labelledby="activity-title">
        <div class="section-heading activity-heading">
          <div>
            <p class="eyebrow">Participation</p>
            <h2 id="activity-title">Activity history</h2>
          </div>
        </div>
        <ActivityTable :activities="history" />
      </section>
    </div>
    </div>
  </main>
</template>
