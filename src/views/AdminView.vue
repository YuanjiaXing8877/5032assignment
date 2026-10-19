<script setup>
import { onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import InteractiveTable from '../components/InteractiveTable.vue'
import { authErrorMessage, authState, listUserAccounts, reviewCoordinatorRequest, updateUserRole } from '../services/auth'
import { activityStatus, useActivities } from '../services/activities'
import { focusTarget } from '../utils/accessibility'

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

const { activities: projects, error: activityLoadError, now } = useActivities()

const userColumns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'registered', label: 'Registered', value: (row) => formatCreatedAt(row.createdAt), sortValue: (row) => row.createdAt?.toMillis?.() || 0 },
  { key: 'request', label: 'Request', value: (row) => row.approvalStatus === 'Pending' ? 'Coordinator pending' : row.approvalStatus || 'Not requested' },
  { key: 'role', label: 'Current role' },
  { key: 'action', label: 'Action', sortable: false, searchable: false }
]
const permissionColumns = [
  { key: 'role', label: 'Role' }, { key: 'account', label: 'Accounts' },
  { key: 'events', label: 'Events' }, { key: 'coordination', label: 'Coordination' },
  { key: 'administration', label: 'Administration' }
]
const projectColumns = [
  { key: 'title', label: 'Activity' }, { key: 'suburb', label: 'Suburb' },
  { key: 'coordinatorName', label: 'Coordinator' }, { key: 'status', label: 'Status', value: row => activityStatus(row, now.value) }
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
    focusTarget(`#user-role-${user.id}`, { scroll: false })
  }
}
async function refreshUsers() { await loadUsers(); focusTarget('#refresh-users', { scroll: false }) }

async function reviewRequest(user, approved) {
  savingUserId.value = user.id; userError.value = ''; successMessage.value = ''
  try {
    await reviewCoordinatorRequest(user.id, approved)
    successMessage.value = approved ? `${user.name || user.email} is now a Coordinator.` : 'Application declined.'
    await loadUsers()
  } catch (error) { userError.value = authErrorMessage(error) }
  finally { savingUserId.value = ''; focusTarget(`#user-role-${user.id}`, { scroll: false }) }
}

onMounted(loadUsers)
</script>

<template>
  <main id="main-content" tabindex="-1" class="admin-page container-xl">
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
        <Button id="refresh-users" class="outline-button" type="button" label="Refresh" icon="pi pi-refresh" outlined :loading="loadingUsers" @click="refreshUsers" />
      </div>

      <Message v-if="userError" severity="error" :closable="false" role="alert">{{ userError }}</Message>
      <Message v-if="successMessage" severity="success" :closable="false" role="status">{{ successMessage }}</Message>
      <p v-if="loadingUsers" class="loading-note" role="status">Loading user accounts…</p>

      <InteractiveTable v-else :rows="users" :columns="userColumns" label="User accounts">
        <template #name="{ row: user }"><strong>{{ user.name || 'Unnamed member' }}</strong></template>
        <template #request="{ row: user }"><span class="request-badge" :class="{ pending: user.approvalStatus === 'Pending' }">{{ user.approvalStatus === 'Pending' ? 'Coordinator pending' : user.approvalStatus || 'Not requested' }}</span><div v-if="user.approvalStatus === 'Pending' && user.id !== authState.user.uid" class="d-flex gap-2 mt-2"><Button type="button" class="primary-button" label="Approve" :disabled="Boolean(savingUserId)" @click="reviewRequest(user, true)" /><Button type="button" class="outline-button" label="Decline" outlined :disabled="Boolean(savingUserId)" @click="reviewRequest(user, false)" /></div></template>
        <template #role="{ row: user }">
          <select :id="`user-role-${user.id}`" v-model="roleDrafts[user.id]" class="form-select role-select" :disabled="user.id === authState.user.uid || savingUserId === user.id" :aria-label="`Role for ${user.name || user.email}`">
            <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
          </select>
          <small v-if="user.id === authState.user.uid" class="field-hint">Your own role is protected</small>
        </template>
        <template #action="{ row: user }"><Button class="primary-button role-save-button" type="button" label="Save role" :disabled="user.id === authState.user.uid || roleDrafts[user.id] === user.role || savingUserId === user.id" :loading="savingUserId === user.id" @click="saveRole(user)" /></template>
      </InteractiveTable>
    </section>

    <section class="admin-section" aria-labelledby="permissions-title">
      <div class="section-heading">
        <div><p class="eyebrow">Authorisation</p><h2 id="permissions-title">Role permission matrix</h2></div>
      </div>
      <InteractiveTable :rows="rolePermissions" :columns="permissionColumns" label="Role permissions" row-key="role" />
    </section>

    <section class="admin-section" aria-labelledby="projects-title">
      <div class="section-heading"><div><p class="eyebrow">Operations</p><h2 id="projects-title">Project overview</h2></div></div>
      <p v-if="activityLoadError" class="field-error" role="alert">{{ activityLoadError }}</p>
      <InteractiveTable :rows="projects" :columns="projectColumns" label="Project overview">
        <template #status="{ row }"><span class="role-badge">{{ activityStatus(row, now) }}</span></template>
      </InteractiveTable>
    </section>
  </main>
</template>
