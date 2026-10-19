<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
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
const route = useRoute()
const sections = computed(() => [
  { hash: '#overview', label: 'Overview' }, { hash: '#personal', label: 'Personal information' },
  { hash: '#browse-activities', label: 'Browse activities' }, { hash: '#activity', label: 'Activity history' },
  ...(['Coordinator', 'Administrator'].includes(authState.user.role) ? [{ hash: '#coordinator-tools', label: 'Coordinator tools' }] : [])
])
const isCurrentSection = hash => route.hash === hash || (!route.hash && hash === '#overview')
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
  <main id="main-content" tabindex="-1" class="profile-page container-xl">
    <div class="row g-3 g-lg-4">
    <aside class="profile-sidebar-column col-12 col-lg-3" aria-label="Account sections">
      <div class="profile-sidebar">
        <p class="sidebar-title">My GreenLink</p>
        <nav aria-label="Account sections" class="profile-sidebar-nav nav nav-pills flex-row flex-lg-column flex-nowrap overflow-auto">
          <a v-for="section in sections" :key="section.hash" :class="['nav-link', { active: isCurrentSection(section.hash) }]" :href="section.hash" :aria-current="isCurrentSection(section.hash) ? 'location' : undefined">{{ section.label }}</a>
        </nav>
      </div>
    </aside>

    <div class="profile-content col-12 col-lg-9">
      <section id="overview" class="welcome-row">
        <div>
          <p class="eyebrow">{{ authState.user.role }} account</p>
          <h1>My GreenLink</h1>
          <p>Welcome back, {{ profileData.user.name.split(' ')[0] }}. Review your details and activity below.</p>
        </div>
        <div><span class="role-badge" role="status" aria-atomic="true">{{ authState.user.role }}</span><div class="avatar mt-2" aria-hidden="true">{{ profileData.user.name.charAt(0) }}</div></div>
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
        <p v-if="!loading && !history.length">No participation records yet. Book a place in Browse activities above to add it to your history.</p>
        <ActivityTable :activities="history" />
      </section>
    </div>
    </div>
  </main>
</template>
