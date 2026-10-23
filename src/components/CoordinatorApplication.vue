<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { applyForCoordinator, authState, authErrorMessage } from '../services/auth'
import { focusTarget } from '../utils/accessibility'
const submitting = ref(false)
const failure = ref('')
async function apply() {
  submitting.value = true
  failure.value = ''
  try { await applyForCoordinator() }
  catch (error) { failure.value = authErrorMessage(error) }
  finally { submitting.value = false; focusTarget('#coordinator-apply-title') }
}
</script>
<template>
  <section v-if="authState.user.role === 'Volunteer'" id="coordinator-application" class="admin-section" aria-labelledby="coordinator-apply-title">
    <p class="eyebrow">Get involved</p><h2 id="coordinator-apply-title">Become a coordinator</h2>
    <Message v-if="failure" severity="error" :closable="false" role="alert">{{ failure }}</Message>
    <Message v-if="authState.user.approvalStatus === 'Pending'" severity="info" :closable="false" role="status">Your application is awaiting administrator approval. Your account remains Volunteer until it is approved.</Message>
    <template v-else><p>Organise activities, manage places and view participant lists. Once approved, your role will show as Coordinator and the management tools will appear here.</p><p v-if="authState.user.approvalStatus === 'Rejected'">Your previous application was not approved. You can contact an administrator or apply again.</p><Button type="button" class="primary-button" label="Apply to be a coordinator" :loading="submitting" :disabled="submitting" @click="apply" /></template>
  </section>
</template>
