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
  <header class="site-header navbar navbar-expand-md">
    <div class="container-xl px-0">
      <RouterLink class="brand navbar-brand" to="/" aria-label="GreenLink Melbourne home">
        <span class="brand-mark" aria-hidden="true">GL</span>
        <span class="brand-name"><strong>GreenLink</strong><small class="d-none d-sm-block">Melbourne</small></span>
      </RouterLink>

      <template v-if="isProfile">
        <button
          class="menu-button navbar-toggler"
          type="button"
          :aria-expanded="menuOpen"
          aria-controls="main-navigation"
          @click="menuOpen = !menuOpen"
        >
          <span class="sr-only">Toggle navigation</span>
          <span aria-hidden="true">{{ menuOpen ? '×' : '☰' }}</span>
        </button>

        <nav id="main-navigation" class="header-nav collapse navbar-collapse" :class="{ show: menuOpen }" aria-label="Main navigation">
          <div class="navbar-nav ms-auto align-items-md-center">
            <RouterLink class="nav-link" to="/profile#overview">Overview</RouterLink>
            <RouterLink class="nav-link" to="/profile#personal">Personal information</RouterLink>
            <RouterLink class="nav-link" to="/profile#activity">Activity history</RouterLink>
            <button class="logout-button" type="button" @click="logout">Log out</button>
          </div>
        </nav>
      </template>
    </div>
  </header>
</template>
