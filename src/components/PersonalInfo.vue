<script setup>
import { reactive, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { sanitizeEmail, sanitizePhone, sanitizePlainText } from '../utils/sanitize'

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['save'])
const editing = ref(false)
const savedMessage = ref('')
const languageChoice = ref('')
const otherLanguage = ref('')
const draft = reactive({})
const errors = reactive({})
const languageOptions = ['Chinese', 'English', 'Arabic', 'French', 'Russian', 'Spanish', 'Other']

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function startEditing() {
  Object.assign(draft, props.user)
  if (languageOptions.slice(0, 6).includes(props.user.language)) {
    languageChoice.value = props.user.language
    otherLanguage.value = ''
  } else {
    languageChoice.value = 'Other'
    otherLanguage.value = props.user.language || ''
  }
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

  if (field === 'gender' && !draft.gender) errors.gender = 'Please select a gender.'
  if (field === 'suburb' && !draft.suburb?.trim()) errors.suburb = 'Suburb is required.'
  if (field === 'language') {
    delete errors.otherLanguage
    if (!languageChoice.value) errors.language = 'Please select a preferred language.'
    else if (languageChoice.value === 'Other' && !otherLanguage.value.trim()) errors.otherLanguage = 'Please enter your preferred language.'
    else if (otherLanguage.value.length > 60) errors.otherLanguage = 'Language preference must be 60 characters or fewer.'
  }
}

function handleInput(field) {
  if (field === 'otherLanguage' && errors.otherLanguage) validateField('language')
  else if (errors[field]) validateField(field)
}

function handleLanguageChange() {
  if (languageChoice.value !== 'Other') otherLanguage.value = ''
  if (errors.language || errors.otherLanguage) validateField('language')
}

function validate() {
  clearErrors()
  ;['name', 'email', 'phone', 'gender', 'suburb', 'language'].forEach(validateField)
  return Object.keys(errors).length === 0
}

function sanitizeDraft() {
  draft.name = sanitizePlainText(draft.name, 80)
  draft.email = sanitizeEmail(draft.email)
  draft.phone = sanitizePhone(draft.phone)
  draft.suburb = sanitizePlainText(draft.suburb, 80)
  otherLanguage.value = sanitizePlainText(otherLanguage.value, 60)
}

function saveDetails() {
  sanitizeDraft()
  if (!validate()) return
  const selectedLanguage = languageChoice.value === 'Other' ? otherLanguage.value.trim() : languageChoice.value
  emit('save', { ...draft, language: selectedLanguage })
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

    <div v-if="!editing" class="table-wrap table-responsive information-table-wrap">
      <table class="information-table table mb-0">
        <caption class="sr-only">Personal account information</caption>
        <tbody>
          <tr><th scope="row">Full name</th><td>{{ user.name }}</td><th scope="row">Account type</th><td><span class="role-badge">{{ user.role }}</span></td></tr>
          <tr><th scope="row">Email</th><td>{{ user.email }}</td><th scope="row">Phone</th><td>{{ user.phone }}</td></tr>
          <tr><th scope="row">Gender</th><td>{{ user.gender }}</td><th scope="row">Suburb</th><td>{{ user.suburb }}</td></tr>
          <tr><th scope="row">Preferred language</th><td>{{ user.language }}</td><th scope="row">Member since</th><td>{{ user.joined }}</td></tr>
          <tr><th scope="row">Email updates</th><td colspan="3">{{ user.emailUpdates }}</td></tr>
        </tbody>
      </table>
    </div>

    <form v-else class="edit-form" @submit.prevent="saveDetails">
      <div class="form-grid row g-3">
        <div class="field-group col-12 col-md-6">
          <label for="profile-name">Full name <span aria-hidden="true">*</span></label>
          <InputText id="profile-name" v-model.trim="draft.name" type="text" required minlength="2" :invalid="Boolean(errors.name)" :aria-invalid="Boolean(errors.name)" :aria-describedby="errors.name ? 'profile-name-error' : undefined" @blur="validateField('name')" @input="handleInput('name')" />
          <small v-if="errors.name" id="profile-name-error" class="field-error">{{ errors.name }}</small>
        </div>

        <div class="field-group col-12 col-md-6">
          <label for="profile-email">Email address <span aria-hidden="true">*</span></label>
          <InputText id="profile-email" v-model.trim="draft.email" type="email" required :invalid="Boolean(errors.email)" :aria-invalid="Boolean(errors.email)" :aria-describedby="errors.email ? 'profile-email-error' : undefined" @blur="validateField('email')" @input="handleInput('email')" />
          <small v-if="errors.email" id="profile-email-error" class="field-error">{{ errors.email }}</small>
        </div>

        <div class="field-group col-12 col-md-6">
          <label for="profile-phone">Phone number <span aria-hidden="true">*</span></label>
          <InputText id="profile-phone" v-model.trim="draft.phone" type="tel" required pattern="0[2-478](?:[ ]?[0-9]){8}" placeholder="04xx xxx xxx" :invalid="Boolean(errors.phone)" :aria-invalid="Boolean(errors.phone)" :aria-describedby="errors.phone ? 'profile-phone-error' : undefined" @blur="validateField('phone')" @input="handleInput('phone')" />
          <small v-if="errors.phone" id="profile-phone-error" class="field-error">{{ errors.phone }}</small>
        </div>

        <div class="field-group col-12 col-md-6">
          <label for="profile-gender">Gender <span aria-hidden="true">*</span></label>
          <select id="profile-gender" v-model="draft.gender" class="profile-select form-select" required :class="{ 'is-invalid': Boolean(errors.gender) }" :aria-invalid="Boolean(errors.gender)" :aria-describedby="errors.gender ? 'profile-gender-error' : undefined" @blur="validateField('gender')" @change="handleInput('gender')">
            <option disabled value="">Select a gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <small v-if="errors.gender" id="profile-gender-error" class="field-error">{{ errors.gender }}</small>
        </div>

        <div class="field-group col-12 col-md-6">
          <label for="profile-suburb">Suburb <span aria-hidden="true">*</span></label>
          <InputText id="profile-suburb" v-model.trim="draft.suburb" type="text" required :invalid="Boolean(errors.suburb)" :aria-invalid="Boolean(errors.suburb)" :aria-describedby="errors.suburb ? 'profile-suburb-error' : undefined" @blur="validateField('suburb')" @input="handleInput('suburb')" />
          <small v-if="errors.suburb" id="profile-suburb-error" class="field-error">{{ errors.suburb }}</small>
        </div>

        <div class="field-group col-12">
          <label for="profile-language">Preferred language <span aria-hidden="true">*</span></label>
          <select id="profile-language" v-model="languageChoice" class="profile-select form-select" required :class="{ 'is-invalid': Boolean(errors.language) }" :aria-invalid="Boolean(errors.language)" :aria-describedby="errors.language ? 'profile-language-error' : undefined" @blur="validateField('language')" @change="handleLanguageChange">
            <option disabled value="">Select a language</option>
            <option v-for="language in languageOptions" :key="language" :value="language">{{ language }}</option>
          </select>
          <small v-if="errors.language" id="profile-language-error" class="field-error">{{ errors.language }}</small>

          <div v-if="languageChoice === 'Other'" class="other-language-field mt-3">
            <label for="profile-other-language">Other language <span aria-hidden="true">*</span></label>
            <InputText id="profile-other-language" v-model.trim="otherLanguage" type="text" required maxlength="60" placeholder="Enter your preferred language" :invalid="Boolean(errors.otherLanguage)" :aria-invalid="Boolean(errors.otherLanguage)" :aria-describedby="errors.otherLanguage ? 'profile-other-language-error' : undefined" @blur="validateField('language')" @input="handleInput('otherLanguage')" />
            <small v-if="errors.otherLanguage" id="profile-other-language-error" class="field-error">{{ errors.otherLanguage }}</small>
          </div>
        </div>
      </div>

      <div class="form-actions d-flex flex-column-reverse flex-sm-row justify-content-end">
        <Button class="outline-button" type="button" label="Cancel" outlined @click="cancelEditing" />
        <Button class="primary-button compact-button" type="submit" label="Save changes" icon="pi pi-check" />
      </div>
    </form>
  </section>
</template>
