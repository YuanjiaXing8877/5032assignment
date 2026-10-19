<script setup>
import { ref } from 'vue'
import axe from 'axe-core'
const running = ref(false)
const output = ref('')
const enlarged = ref(false)
const spaced = ref(false)
let originalText = []
function toggleTextSize() {
  enlarged.value = !enlarged.value
  if (enlarged.value) {
    originalText = [...document.querySelectorAll('main, main *, header, header *, footer, footer *')].map(el => ({ el, size: el.style.fontSize, height: el.style.lineHeight, computedSize: parseFloat(getComputedStyle(el).fontSize), computedHeight: parseFloat(getComputedStyle(el).lineHeight) }))
    originalText.forEach(({ el, computedSize, computedHeight }) => { el.style.fontSize = `${computedSize * 2}px`; if (Number.isFinite(computedHeight)) el.style.lineHeight = `${computedHeight * 2}px` })
  } else originalText.forEach(({ el, size, height }) => { el.style.fontSize = size; el.style.lineHeight = height })
}
function toggleSpacing() { spaced.value = !spaced.value; document.documentElement.classList.toggle('a11y-spacing-test', spaced.value) }
async function audit() {
  running.value = true
  output.value = ''
  try {
    const result = await axe.run({ exclude: ['#accessibility-audit-panel'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } })
    const simplify = entry => ({ id: entry.id, impact: entry.impact, description: entry.help, helpUrl: entry.helpUrl, nodes: entry.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })
    output.value = JSON.stringify({ page: location.pathname, title: document.title, axe: result.testEngine.version, viewport: { width: innerWidth, height: innerHeight }, doubledText: enlarged.value, textSpacing: spaced.value, violations: result.violations.map(simplify), incomplete: result.incomplete.map(simplify), passedRules: result.passes.length }, null, 2)
  } catch (error) { output.value = JSON.stringify({ error: error.message }) }
  finally { running.value = false }
}
</script>
<template>
  <aside id="accessibility-audit-panel" aria-label="Development accessibility checks">
    <button type="button" :disabled="running" @click="audit">{{ running ? 'Checking accessibility…' : 'Run accessibility checks' }}</button>
    <button type="button" :aria-pressed="enlarged" @click="toggleTextSize">Double text size</button>
    <button type="button" :aria-pressed="spaced" @click="toggleSpacing">Test text spacing</button>
    <details v-if="output" open><summary>Accessibility results</summary><pre id="accessibility-results">{{ output }}</pre></details>
  </aside>
</template>
<style scoped>
aside { margin: 16px; padding: 16px; color: #202b3c; background: white; border: 1px solid #737f8d; }
button { padding: 10px; margin: 4px; color: white; background: #234e70; border: 0; }
pre { max-height: 220px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; }
</style>
<style>
.a11y-spacing-test :is(main, header, footer) * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
.a11y-spacing-test p { margin-bottom: 2em !important; }
</style>
