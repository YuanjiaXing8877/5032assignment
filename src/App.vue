<script setup>
import { defineAsyncComponent, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { focusTarget } from './utils/accessibility'
import SiteFooter from './components/SiteFooter.vue'
import SiteHeader from './components/SiteHeader.vue'
const route = useRoute()
const AccessibilityAudit = import.meta.env.DEV ? defineAsyncComponent(() => import('./dev/AccessibilityAudit.vue')) : null
const showAudit = import.meta.env.DEV && new URLSearchParams(location.search).has('audit')
watch(() => route.fullPath, (current, previous) => {
  if (route.hash) focusTarget(document.getElementById(decodeURIComponent(route.hash.slice(1))))
  else if (current?.split('#')[0] !== previous?.split('#')[0]) focusTarget('main h1', { scroll: false })
}, { flush: 'post', immediate: true })
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content" @click.prevent="focusTarget('#main-content')">Skip to main content</a>
    <SiteHeader />
    <RouterView />
    <SiteFooter />
    <component :is="AccessibilityAudit" v-if="showAudit" />
  </div>
</template>
