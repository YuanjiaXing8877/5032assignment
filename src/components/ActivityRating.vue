<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Button from 'primevue/button'
import { saveActivityRating, watchActivityRatings } from '../services/ratings'

const props = defineProps({
  activity: {
    type: Object,
    required: true
  }
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
let unsubscribe = () => {}

const highlightedScore = computed(() => hoverScore.value || selectedScore.value)
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
  <div class="activity-rating" :aria-label="`Rating for ${activity.activity}`">
    <span v-if="loading" class="rating-loading">Loading ratings…</span>
    <template v-else>
      <div class="aggregate-rating" :aria-label="aggregateText">
        <span class="aggregate-star" aria-hidden="true">★</span>
        <strong>{{ count ? average.toFixed(1) : '–' }}</strong>
        <span>({{ count }})</span>
      </div>

      <div class="rating-editor">
        <span class="rating-prompt">{{ savedScore ? 'Your rating' : 'Rate this activity' }}</span>
        <div class="star-buttons" role="radiogroup" :aria-label="`Choose a rating for ${activity.activity}`" @mouseleave="hoverScore = 0">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            role="radio"
            :aria-checked="selectedScore === star"
            :aria-label="`${star} out of 5 stars`"
            :class="{ active: star <= highlightedScore }"
            @mouseenter="hoverScore = star"
            @focus="hoverScore = star"
            @blur="hoverScore = 0"
            @click="selectedScore = star; message = ''; errorMessage = ''"
          >★</button>
        </div>
        <Button class="rating-save-button" type="button" :label="saving ? 'Saving…' : savedScore ? 'Update' : 'Submit'" :disabled="!selectedScore || selectedScore === savedScore || saving" @click="submitRating" />
      </div>

      <small class="rating-summary">{{ aggregateText }}</small>
      <small v-if="message" class="rating-success" role="status">{{ message }}</small>
      <small v-if="errorMessage" class="field-error" role="alert">{{ errorMessage }}</small>
    </template>
  </div>
</template>
