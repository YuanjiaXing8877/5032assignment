<script setup>
import { computed } from 'vue'
const props = defineProps({ id: { type: String, required: true }, title: { type: String, required: true }, description: { type: String, required: true }, items: { type: Array, required: true }, unit: { type: String, required: true }, selectedKey: { type: String, default: '' }, vertical: Boolean })
defineEmits(['select'])
const maximum = computed(() => Math.max(1, ...props.items.map(item => item.value)))
const number = value => new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 }).format(value)
</script>
<template>
  <section class="statistics-chart" :aria-labelledby="`${id}-title`">
    <h3 :id="`${id}-title`">{{ title }}</h3>
    <p :id="`${id}-description`">{{ description }} Select a bar to filter the activity records below. Exact values are also available in the chart data table.</p>
    <p v-if="!items.length" class="chart-empty">No activities match these filters.</p>
    <template v-else>
      <p class="chart-scale">Scale: 0–{{ number(maximum) }} {{ unit }}</p>
      <div class="chart-scroll" tabindex="0" role="region" :aria-label="`${title} interactive bars`">
        <ul class="chart-bars" :class="{ vertical }" :aria-describedby="`${id}-description`">
          <li v-for="item in items" :key="item.key">
            <button type="button" class="bar-button" :class="{ selected: item.key === selectedKey }" :aria-pressed="item.key === selectedKey" :aria-label="`${item.label}: ${number(item.value)} ${unit}. Filter activity records.`" @click="$emit('select', item.key)">
              <span class="bar-label">{{ item.label }}</span><strong class="bar-value">{{ number(item.value) }}<span class="sr-only"> {{ unit }}</span></strong>
              <span class="bar-track" aria-hidden="true"><span class="bar-fill" :style="vertical ? { height: `${item.value / maximum * 100}%` } : { width: `${item.value / maximum * 100}%` }"></span></span>
              <span v-if="item.key === selectedKey" class="selected-label">✓ Selected</span>
            </button>
          </li>
        </ul>
      </div>
      <p v-if="items.every(item => !item.value)" class="chart-empty">All values are zero for this selection.</p>
      <details class="chart-data"><summary>View chart data as a table</summary><div class="table-wrap" tabindex="0" role="region" :aria-label="`${title} data`"><table><caption>{{ title }} — {{ unit }}</caption><thead><tr><th scope="col">Category</th><th scope="col">{{ unit }}</th></tr></thead><tbody><tr v-for="item in items" :key="item.key"><th scope="row">{{ item.label }}</th><td>{{ number(item.value) }}</td></tr></tbody></table></div></details>
    </template>
  </section>
</template>
<style scoped>
.statistics-chart { min-width: 0; padding: 18px; border: 1px solid var(--line); border-radius: 5px; background: white; }
h3 { font-size: 18px; margin: 0 0 8px; } p, summary, caption { font-size: 12px; color: var(--muted); }
.chart-scale { margin: 12px 0 8px; }
.chart-scroll { overflow-x: auto; padding: 5px; }
.chart-bars { list-style: none; padding: 0; margin: 0; display: grid; gap: 9px; }
.bar-button { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 5px 12px; width: 100%; min-height: 54px; padding: 8px; border: 2px solid transparent; border-radius: 3px; background: #f7f8fa; color: var(--accent-strong); text-align: left; font-size: 12px; }
.bar-label { overflow-wrap: anywhere; } .bar-value { font-variant-numeric: tabular-nums; }
.bar-track { grid-column: 1 / -1; height: 13px; background: #dde4ec; display: block; }
.bar-fill { display: block; height: 100%; background: #234e70; }
.bar-button:hover, .bar-button.selected { border-color: var(--accent); }
.bar-button:focus-visible, .chart-scroll:focus-visible, summary:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.selected-label { grid-column: 1 / -1; font-size: 11px; font-weight: 700; }
.vertical { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(58px, 1fr); align-items: stretch; }
.vertical .bar-button { height: 240px; grid-template-columns: minmax(0, 1fr); grid-template-rows: 1fr auto auto; gap: 6px; text-align: center; }
.vertical .bar-track { grid-column: 1; grid-row: 1; width: 80%; height: 150px; margin-inline: auto; display: flex; align-items: flex-end; align-self: end; }
.vertical .bar-fill { width: 100%; }
.vertical .bar-label { grid-row: 3; }
.vertical .bar-value { grid-row: 2; }
.vertical .selected-label { grid-row: 4; }
.chart-data { margin-top: 15px; } summary { color: var(--accent); cursor: pointer; padding: 5px 0; }
.chart-data table { font-size: 12px; } .chart-empty { margin-top: 12px; }
@media (forced-colors: active) { .bar-fill { background: Highlight; } .bar-track { outline: 1px solid CanvasText; } }
</style>
