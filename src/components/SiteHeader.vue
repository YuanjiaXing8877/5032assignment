<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { authState, logout as signOutUser } from '../services/auth'

const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const isAuthenticated = computed(() => Boolean(authState.user))

watch(() => route.fullPath, () => {
  menuOpen.value = false
})

async function logout() {
  menuOpen.value = false
  await signOutUser()
  router.replace('/')
}
</script>

<template>
  <header class="site-header navbar navbar-expand-md">
    <div class="container-xl px-0">
      <RouterLink class="brand navbar-brand" to="/" aria-label="GreenLink Melbourne home">
        <span class="brand-mark" aria-hidden="true">GL</span>
        <span class="brand-name"><strong>GreenLink</strong><small class="d-none d-sm-block">Melbourne</small></span>
      </RouterLink>

      <template v-if="isAuthenticated">
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
            <RouterLink class="nav-link" to="/profile">My account</RouterLink>
            <RouterLink class="nav-link" to="/email">Send email</RouterLink>
            <RouterLink v-if="authState.user.role === 'Administrator'" class="nav-link" to="/admin">Administration</RouterLink>
            <span class="header-role">{{ authState.user.role }}</span>
            <button class="logout-button" type="button" @click="logout">Log out</button>
          </div>
        </nav>
      </template>
    </div>
  </header>
</template>
