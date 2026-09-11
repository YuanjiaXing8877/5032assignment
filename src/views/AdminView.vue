<script setup>
import { authState } from '../services/auth'

const rolePermissions = [
  { role: 'Volunteer', account: 'Own account', events: 'Browse and book', coordination: 'No access', administration: 'No access' },
  { role: 'Coordinator', account: 'Own account', events: 'Create and manage', coordination: 'Participant lists', administration: 'No access' },
  { role: 'Administrator', account: 'All accounts', events: 'Full access', coordination: 'Full access', administration: 'Users and reports' }
]

const projects = [
  { name: 'Shade Corridor Planting', suburb: 'Sunshine West', coordinator: 'Amina Abdi', status: 'Underway' },
  { name: 'Kororoit Creek Care Day', suburb: 'Albion', coordinator: 'Amina Abdi', status: 'Planned' },
  { name: 'Pollinator Garden Working Bee', suburb: 'Footscray', coordinator: 'Jordan Lee', status: 'Completed' }
]
</script>

<template>
  <main class="admin-page container-xl">
    <section class="welcome-row">
      <div>
        <p class="eyebrow">Protected administration area</p>
        <h1>Administrator dashboard</h1>
        <p>Signed in as {{ authState.user.name }}. This route is restricted to Administrator accounts.</p>
      </div>
      <span class="role-badge admin-badge">Administrator</span>
    </section>

    <section class="admin-section" aria-labelledby="permissions-title">
      <div class="section-heading">
        <div><p class="eyebrow">Authorisation</p><h2 id="permissions-title">Role permission matrix</h2></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Role</th><th>Accounts</th><th>Events</th><th>Coordination</th><th>Administration</th></tr></thead>
          <tbody><tr v-for="permission in rolePermissions" :key="permission.role"><th>{{ permission.role }}</th><td>{{ permission.account }}</td><td>{{ permission.events }}</td><td>{{ permission.coordination }}</td><td>{{ permission.administration }}</td></tr></tbody>
        </table>
      </div>
    </section>

    <section class="admin-section" aria-labelledby="projects-title">
      <div class="section-heading"><div><p class="eyebrow">Operations</p><h2 id="projects-title">Project overview</h2></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Project</th><th>Suburb</th><th>Coordinator</th><th>Status</th></tr></thead>
          <tbody><tr v-for="project in projects" :key="project.name"><td>{{ project.name }}</td><td>{{ project.suburb }}</td><td>{{ project.coordinator }}</td><td><span class="role-badge">{{ project.status }}</span></td></tr></tbody>
        </table>
      </div>
    </section>
  </main>
</template>
