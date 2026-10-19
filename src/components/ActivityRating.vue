<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Button from 'primevue/button'
import { saveActivityRating, watchActivityRatings } from '../services/ratings'
import { focusTarget, ratingKeyValue } from '../utils/accessibility'

const props = defineProps({
  activity: {
    type: Object,
    required: true
  },
  readOnly: { type: Boolean, default: false }
})

const selectedScore = ref(0)
const savedScore = ref(0)
const hoverScore = ref(0)
const average = ref(0)
const count = ref(0)
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const starGroup = ref(null)
let unsubscribe = () => {}

const highlightedScore = computed(() => hoverScore.value || selectedScore.value)
function selectScore(score) { selectedScore.value = score; message.value = ''; errorMessage.value = '' }
function handleRatingKey(event, star) {
  const next = ratingKeyValue(event.key, star)
  if (next === null) return
  event.preventDefault()
  selectScore(next)
  event.currentTarget.parentElement.querySelector(`[data-rating-value="${next}"]`)?.focus()
}
const aggregateText = computed(() => count.value
  ? `${average.value.toFixed(1)} out of 5 from ${count.value} ${count.value === 1 ? 'rating' : 'ratings'}`
  : 'No ratings yet')

async function submitRating() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    await saveActivityRating(props.activity, selectedScore.value)
    savedScore.value = selectedScore.value
    message.value = savedScore.value ? 'Your rating has been saved.' : ''
  } catch (error) {
    errorMessage.value = error.message || 'Your rating could not be saved.'
  } finally {
    saving.value = false
    focusTarget(starGroup.value?.querySelector('[aria-checked="true"]'), { scroll: false })
  }
}

onMounted(() => {
  unsubscribe = watchActivityRatings(props.activity.id, (summary) => {
    average.value = summary.average
    count.value = summary.count
    savedScore.value = summary.ownScore
    if (!selectedScore.value) selectedScore.value = summary.ownScore
    loading.value = false
  }, () => {
    errorMessage.value = 'Ratings could not be loaded.'
    loading.value = false
  })
})

onUnmounted(() => unsubscribe())
</script>

<template>
  <div class="activity-rating" role="group" :class="{ 'read-only-rating': readOnly }" :aria-label="`Rating for ${activity.activity}`">
    <span v-if="loading" class="rating-loading" role="status">Loading ratings…</span>
    <template v-else>
      <div class="aggregate-rating" role="img" :aria-label="aggregateText">
        <svg class="aggregate-star" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z" /></svg>
        <strong>{{ count ? average.toFixed(1) : '–' }}</strong>
        <span>({{ count }})</span>
      </div>

      <div v-if="!readOnly" class="rating-editor">
        <span class="rating-prompt">{{ savedScore ? 'Your rating' : 'Rate this activity' }}</span>
        <div ref="starGroup" class="star-buttons" role="radiogroup" :aria-label="`Choose a rating for ${activity.activity}`" @mouseleave="hoverScore = 0">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            role="radio"
            :aria-checked="selectedScore === star"
            :aria-label="`${star} out of 5 stars`"
            :tabindex="star === (selectedScore || 1) ? 0 : -1"
            :data-rating-value="star"
            :class="{ active: star <= highlightedScore }"
            @mouseenter="hoverScore = star"
            @focus="hoverScore = star"
            @blur="hoverScore = 0"
            @click="selectScore(star)"
            @keydown="handleRatingKey($event, star)"
          ><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z" /></svg></button>
        </div>
        <Button class="rating-save-button" type="button" :label="saving ? 'Saving…' : savedScore ? 'Update' : 'Submit'" :disabled="!selectedScore || selectedScore === savedScore || saving" @click="submitRating" />
      </div>

      <small class="rating-summary">{{ aggregateText }}</small>
      <small v-if="message" class="rating-success" role="status">{{ message }}</small>
      <small v-if="errorMessage" class="field-error" role="alert">{{ errorMessage }}</small>
    </template>
  </div>
</template>

<style scoped>.read-only-rating { min-width: 105px; }</style>
