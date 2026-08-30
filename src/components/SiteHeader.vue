<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const isProfile = computed(() => route.name === 'profile')

watch(() => route.fullPath, () => {
  menuOpen.value = false
})

function logout() {
  menuOpen.value = false
  router.push('/')
}
</script>

<template>
  <header class="site-header">
    <RouterLink class="brand" to="/" aria-label="GreenLink Melbourne home">
      <span class="brand-mark" aria-hidden="true">GL</span>
      <span class="brand-name"><strong>GreenLink</strong><small>Melbourne</small></span>
    </RouterLink>

    <template v-if="isProfile">
      <button
        class="menu-button"
        type="button"
        :aria-expanded="menuOpen"
        aria-controls="main-navigation"
        @click="menuOpen = !menuOpen"
      >
        <span class="sr-only">Toggle navigation</span>
        <span aria-hidden="true">{{ menuOpen ? '×' : '☰' }}</span>
      </button>

      <nav id="main-navigation" class="header-nav" :class="{ open: menuOpen }" aria-label="Main navigation">
        <RouterLink to="/profile#overview">Overview</RouterLink>
        <RouterLink to="/profile#personal">Personal information</RouterLink>
        <RouterLink to="/profile#activity">Activity history</RouterLink>
        <button class="logout-button" type="button" @click="logout">Log out</button>
      </nav>
    </template>
  </header>
</template>
