<script setup>
defineProps({
  summary: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <section class="summary-cards" aria-label="Volunteer summary">
    <article><strong>{{ summary.activities }}</strong><span>activities</span></article>
    <article><strong>{{ summary.hours }}</strong><span>volunteer hours</span></article>
    <article><strong>{{ summary.trees }}</strong><span>trees planted</span></article>
  </section>
</template>
