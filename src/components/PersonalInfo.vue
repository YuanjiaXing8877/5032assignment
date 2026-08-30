<script setup>
import { reactive, ref } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['save'])
const editing = ref(false)
const savedMessage = ref('')
const draft = reactive({})
const errors = reactive({})

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function startEditing() {
  Object.assign(draft, props.user)
  clearErrors()
  savedMessage.value = ''
  editing.value = true
}

function validate() {
  clearErrors()

  if (!draft.name?.trim()) errors.name = 'Full name is required.'
  else if (draft.name.trim().length < 2) errors.name = 'Full name must contain at least 2 characters.'

  if (!draft.email?.trim()) errors.email = 'Email address is required.'
  else if (!/^\S+@\S+\.\S+$/.test(draft.email)) errors.email = 'Enter a valid email address.'

  if (!draft.phone?.trim()) errors.phone = 'Phone number is required.'
  else if (!/^0[2-478](?:[ ]?[0-9]){8}$/.test(draft.phone)) errors.phone = 'Enter a valid Australian phone number.'

  if (!draft.suburb?.trim()) errors.suburb = 'Suburb is required.'
  if (draft.language?.length > 60) errors.language = 'Language preference must be 60 characters or fewer.'

  return Object.keys(errors).length === 0
}

function validateField(field) {
  if (errors[field]) validate()
}

function saveDetails() {
  if (!validate()) return
  emit('save', { ...draft })
  editing.value = false
  savedMessage.value = 'Your personal information has been updated.'
}

function cancelEditing() {
  editing.value = false
  clearErrors()
}
</script>

<template>
  <section id="personal" aria-labelledby="personal-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Account</p>
        <h2 id="personal-title">Personal information</h2>
      </div>
      <button v-if="!editing" class="outline-button" type="button" @click="startEditing">Edit details</button>
    </div>

    <p v-if="savedMessage" class="success-message" role="status">{{ savedMessage }}</p>

    <div v-if="!editing" class="table-wrap information-table-wrap">
      <table class="information-table">
        <caption class="sr-only">Personal account information</caption>
        <tbody>
          <tr><th scope="row">Full name</th><td>{{ user.name }}</td><th scope="row">Account type</th><td><span class="role-badge">{{ user.role }}</span></td></tr>
          <tr><th scope="row">Email</th><td>{{ user.email }}</td><th scope="row">Phone</th><td>{{ user.phone }}</td></tr>
          <tr><th scope="row">Suburb</th><td>{{ user.suburb }}</td><th scope="row">Preferred language</th><td>{{ user.language }}</td></tr>
          <tr><th scope="row">Member since</th><td>{{ user.joined }}</td><th scope="row">Email updates</th><td>{{ user.emailUpdates }}</td></tr>
        </tbody>
      </table>
    </div>

    <form v-else class="edit-form" novalidate @submit.prevent="saveDetails">
      <div class="form-grid">
        <div class="field-group">
          <label for="profile-name">Full name <span aria-hidden="true">*</span></label>
          <input id="profile-name" v-model.trim="draft.name" type="text" required :aria-invalid="Boolean(errors.name)" :aria-describedby="errors.name ? 'profile-name-error' : undefined" @input="validateField('name')" />
          <small v-if="errors.name" id="profile-name-error" class="field-error">{{ errors.name }}</small>
        </div>

        <div class="field-group">
          <label for="profile-email">Email address <span aria-hidden="true">*</span></label>
          <input id="profile-email" v-model.trim="draft.email" type="email" required :aria-invalid="Boolean(errors.email)" :aria-describedby="errors.email ? 'profile-email-error' : undefined" @input="validateField('email')" />
          <small v-if="errors.email" id="profile-email-error" class="field-error">{{ errors.email }}</small>
        </div>

        <div class="field-group">
          <label for="profile-phone">Phone number <span aria-hidden="true">*</span></label>
          <input id="profile-phone" v-model.trim="draft.phone" type="tel" required placeholder="04xx xxx xxx" :aria-invalid="Boolean(errors.phone)" :aria-describedby="errors.phone ? 'profile-phone-error' : undefined" @input="validateField('phone')" />
          <small v-if="errors.phone" id="profile-phone-error" class="field-error">{{ errors.phone }}</small>
        </div>

        <div class="field-group">
          <label for="profile-suburb">Suburb <span aria-hidden="true">*</span></label>
          <input id="profile-suburb" v-model.trim="draft.suburb" type="text" required :aria-invalid="Boolean(errors.suburb)" :aria-describedby="errors.suburb ? 'profile-suburb-error' : undefined" @input="validateField('suburb')" />
          <small v-if="errors.suburb" id="profile-suburb-error" class="field-error">{{ errors.suburb }}</small>
        </div>

        <div class="field-group full-width">
          <label for="profile-language">Preferred language</label>
          <input id="profile-language" v-model.trim="draft.language" type="text" maxlength="60" :aria-invalid="Boolean(errors.language)" :aria-describedby="errors.language ? 'profile-language-error' : undefined" @input="validateField('language')" />
          <small v-if="errors.language" id="profile-language-error" class="field-error">{{ errors.language }}</small>
        </div>
      </div>

      <div class="form-actions">
        <button class="outline-button" type="button" @click="cancelEditing">Cancel</button>
        <button class="primary-button compact-button" type="submit">Save changes</button>
      </div>
    </form>
  </section>
</template>
