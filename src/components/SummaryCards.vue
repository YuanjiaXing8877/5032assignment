<script setup>
defineProps({
  summary: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <section class="summary-cards row g-2 g-md-3" aria-label="Volunteer summary">
    <div class="col-4"><article><strong>{{ summary.activities }}</strong><span>activities</span></article></div>
    <div class="col-4"><article><strong>{{ summary.hours }}</strong><span>volunteer hours</span></article></div>
    <div class="col-4"><article><strong>{{ summary.trees }}</strong><span>trees planted</span></article></div>
  </section>
</template>
