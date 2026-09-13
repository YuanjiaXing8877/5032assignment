<script setup>
import { onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { authErrorMessage, authState, listUserAccounts, updateUserRole } from '../services/auth'

const roleOptions = ['Volunteer', 'Coordinator', 'Administrator']
const users = ref([])
const roleDrafts = reactive({})
const loadingUsers = ref(true)
const savingUserId = ref('')
const userError = ref('')
const successMessage = ref('')

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

function formatCreatedAt(value) {
  if (!value?.toDate) return 'Not available'
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(value.toDate())
}

async function loadUsers() {
  loadingUsers.value = true
  userError.value = ''
  try {
    users.value = await listUserAccounts()
    users.value.forEach((user) => { roleDrafts[user.id] = user.role })
  } catch (error) {
    userError.value = authErrorMessage(error)
  } finally {
    loadingUsers.value = false
  }
}

async function saveRole(user) {
  savingUserId.value = user.id
  userError.value = ''
  successMessage.value = ''
  try {
    const newRole = roleDrafts[user.id]
    await updateUserRole(user.id, newRole)
    user.role = newRole
    user.approvalStatus = newRole === 'Volunteer' ? 'Not requested' : 'Approved'
    successMessage.value = `${user.name || user.email} is now ${newRole}.`
  } catch (error) {
    roleDrafts[user.id] = user.role
    userError.value = authErrorMessage(error)
  } finally {
    savingUserId.value = ''
  }
}

onMounted(loadUsers)
</script>

<template>
  <main class="admin-page container-xl">
    <section class="welcome-row">
      <div>
        <p class="eyebrow">Protected administration area</p>
        <h1>Administrator dashboard</h1>
        <p>Signed in as {{ authState.user.name }}. Manage role requests and review GreenLink operations.</p>
      </div>
      <span class="role-badge admin-badge">Administrator</span>
    </section>

    <section class="admin-section" aria-labelledby="users-title">
      <div class="section-heading">
        <div><p class="eyebrow">User administration</p><h2 id="users-title">Manage user roles</h2></div>
        <Button class="outline-button" type="button" label="Refresh" icon="pi pi-refresh" outlined :loading="loadingUsers" @click="loadUsers" />
      </div>

      <Message v-if="userError" severity="error" :closable="false" role="alert">{{ userError }}</Message>
      <Message v-if="successMessage" severity="success" :closable="false" role="status">{{ successMessage }}</Message>
      <p v-if="loadingUsers" class="loading-note" role="status">Loading user accounts…</p>

      <div v-else class="table-wrap">
        <table class="user-management-table">
          <thead><tr><th>User</th><th>Registered</th><th>Request</th><th>Current role</th><th>Action</th></tr></thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td><strong>{{ user.name || 'Unnamed member' }}</strong><small>{{ user.email }}</small></td>
              <td>{{ formatCreatedAt(user.createdAt) }}</td>
              <td>
                <span v-if="user.approvalStatus === 'Pending'" class="request-badge pending">Coordinator pending</span>
                <span v-else class="request-badge">{{ user.approvalStatus || 'Not requested' }}</span>
              </td>
              <td>
                <select v-model="roleDrafts[user.id]" class="form-select role-select" :disabled="user.id === authState.user.uid || savingUserId === user.id" :aria-label="`Role for ${user.name || user.email}`">
                  <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
                </select>
                <small v-if="user.id === authState.user.uid" class="field-hint">Your own role is protected</small>
              </td>
              <td>
                <Button class="primary-button role-save-button" type="button" label="Save role" :disabled="user.id === authState.user.uid || roleDrafts[user.id] === user.role || savingUserId === user.id" :loading="savingUserId === user.id" @click="saveRole(user)" />
              </td>
            </tr>
            <tr v-if="!users.length"><td colspan="5" class="empty-table">No user profiles found.</td></tr>
          </tbody>
        </table>
      </div>
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
