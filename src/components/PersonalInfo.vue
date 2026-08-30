<script setup>
import { reactive, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'

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

function validateField(field) {
  delete errors[field]

  if (field === 'name') {
    if (!draft.name?.trim()) errors.name = 'Full name is required.'
    else if (draft.name.trim().length < 2) errors.name = 'Full name must contain at least 2 characters.'
  }

  if (field === 'email') {
    if (!draft.email?.trim()) errors.email = 'Email address is required.'
    else if (!/^\S+@\S+\.\S+$/.test(draft.email)) errors.email = 'Enter a valid email address.'
  }

  if (field === 'phone') {
    if (!draft.phone?.trim()) errors.phone = 'Phone number is required.'
    else if (!/^0[2-478](?:[ ]?[0-9]){8}$/.test(draft.phone)) errors.phone = 'Enter a valid Australian phone number.'
  }

  if (field === 'suburb' && !draft.suburb?.trim()) errors.suburb = 'Suburb is required.'
  if (field === 'language' && draft.language?.length > 60) errors.language = 'Language preference must be 60 characters or fewer.'
}

function handleInput(field) {
  if (errors[field]) validateField(field)
}

function validate() {
  clearErrors()
  ;['name', 'email', 'phone', 'suburb', 'language'].forEach(validateField)
  return Object.keys(errors).length === 0
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
      <Button v-if="!editing" class="outline-button" type="button" label="Edit details" icon="pi pi-pencil" outlined @click="startEditing" />
    </div>

    <Message v-if="savedMessage" severity="success" :closable="false" class="success-message" role="status">{{ savedMessage }}</Message>

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

    <form v-else class="edit-form" @submit.prevent="saveDetails">
      <div class="form-grid">
        <div class="field-group">
          <label for="profile-name">Full name <span aria-hidden="true">*</span></label>
          <InputText id="profile-name" v-model.trim="draft.name" type="text" required minlength="2" :invalid="Boolean(errors.name)" :aria-invalid="Boolean(errors.name)" :aria-describedby="errors.name ? 'profile-name-error' : undefined" @blur="validateField('name')" @input="handleInput('name')" />
          <small v-if="errors.name" id="profile-name-error" class="field-error">{{ errors.name }}</small>
        </div>

        <div class="field-group">
          <label for="profile-email">Email address <span aria-hidden="true">*</span></label>
          <InputText id="profile-email" v-model.trim="draft.email" type="email" required :invalid="Boolean(errors.email)" :aria-invalid="Boolean(errors.email)" :aria-describedby="errors.email ? 'profile-email-error' : undefined" @blur="validateField('email')" @input="handleInput('email')" />
          <small v-if="errors.email" id="profile-email-error" class="field-error">{{ errors.email }}</small>
        </div>

        <div class="field-group">
          <label for="profile-phone">Phone number <span aria-hidden="true">*</span></label>
          <InputText id="profile-phone" v-model.trim="draft.phone" type="tel" required pattern="0[2-478](?:[ ]?[0-9]){8}" placeholder="04xx xxx xxx" :invalid="Boolean(errors.phone)" :aria-invalid="Boolean(errors.phone)" :aria-describedby="errors.phone ? 'profile-phone-error' : undefined" @blur="validateField('phone')" @input="handleInput('phone')" />
          <small v-if="errors.phone" id="profile-phone-error" class="field-error">{{ errors.phone }}</small>
        </div>

        <div class="field-group">
          <label for="profile-suburb">Suburb <span aria-hidden="true">*</span></label>
          <InputText id="profile-suburb" v-model.trim="draft.suburb" type="text" required :invalid="Boolean(errors.suburb)" :aria-invalid="Boolean(errors.suburb)" :aria-describedby="errors.suburb ? 'profile-suburb-error' : undefined" @blur="validateField('suburb')" @input="handleInput('suburb')" />
          <small v-if="errors.suburb" id="profile-suburb-error" class="field-error">{{ errors.suburb }}</small>
        </div>

        <div class="field-group full-width">
          <label for="profile-language">Preferred language</label>
          <InputText id="profile-language" v-model.trim="draft.language" type="text" maxlength="60" :invalid="Boolean(errors.language)" :aria-invalid="Boolean(errors.language)" :aria-describedby="errors.language ? 'profile-language-error' : undefined" @blur="validateField('language')" @input="handleInput('language')" />
          <small v-if="errors.language" id="profile-language-error" class="field-error">{{ errors.language }}</small>
        </div>
      </div>

      <div class="form-actions">
        <Button class="outline-button" type="button" label="Cancel" outlined @click="cancelEditing" />
        <Button class="primary-button compact-button" type="submit" label="Save changes" icon="pi pi-check" />
      </div>
    </form>
  </section>
</template>
