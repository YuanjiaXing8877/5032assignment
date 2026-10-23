<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main id="main-content" tabindex="-1" class="status-page container-xl">
    <section>
      <i class="pi pi-lock" aria-hidden="true"></i>
      <p class="eyebrow">Access denied</p>
      <h1>You do not have permission to view this page</h1>
      <p>Your account is signed in, but this area requires the Administrator role.</p>
      <RouterLink class="status-link" to="/profile">Return to my account</RouterLink>
    </section>
  </main>
</template>
