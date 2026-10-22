<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import StatisticsChart from './StatisticsChart.vue'
import InteractiveTable from './InteractiveTable.vue'
import { authState } from '../services/auth'
import { getActivityStatistics } from '../services/statistics'
import { formatActivityTime } from '../services/activities'
import { melbourneDateKey, shiftMonth } from '../utils/calendar'
import { focusTarget } from '../utils/accessibility'

const props = defineProps({ sectionId: { type: String, default: 'statistics' } })
const thisMonth = melbourneDateKey(Date.now()).slice(0, 7)
const initialFrom = shiftMonth(`${thisMonth}-01`, -5).slice(0, 7)
const filters = reactive({ scope: 'personal', fromMonth: initialFrom, toMonth: thisMonth, suburb: '' })
const report = ref(null)
const loading = ref(false)
const error = ref('')
const selection = ref(null)
const participationMetric = ref('bookings')
let revision = 0
let active = true
const number = value => new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 }).format(value)
const scopeOptions = computed(() => [
  { value: 'personal', label: 'My volunteering' },
  ...(['Coordinator', 'Administrator'].includes(authState.user?.role) ? [{ value: 'managed', label: 'Activities I coordinate' }] : []),
  ...(authState.user?.role === 'Administrator' ? [{ value: 'all', label: 'All activities' }] : [])
])
const scopeLabel = computed(() => scopeOptions.value.find(option => option.value === report.value?.filters.scope)?.label || '')
const pendingFilters = computed(() => report.value && JSON.stringify(filters) !== JSON.stringify(report.value.filters))
const totals = computed(() => report.value ? [
  { label: 'Activities in range', value: report.value.totals.activities },
  ...(report.value.filters.scope === 'personal' ? [] : [{ label: 'Unique participants', value: report.value.totals.participants }]),
  { label: 'Booked places', value: report.value.totals.bookings },
  { label: 'Recorded attendance', value: report.value.totals.attendance },
  { label: 'Completed volunteer hours', value: report.value.totals.hours }
] : [])
const monthlyItems = computed(() => (report.value?.months || []).map(month => ({ key: month.key, label: month.label, value: month.hours })))
const participationItems = computed(() => [...(report.value?.activities || [])].sort((a, b) => b[participationMetric.value] - a[participationMetric.value] || a.title.localeCompare(b.title)).slice(0, 10).map(row => ({ key: row.id, label: row.title, value: row[participationMetric.value] })))
const distributionItems = computed(() => (report.value?.suburbs || []).slice(0, 10).map(row => ({ key: row.key, label: row.label, value: row.activities })))
const selectedLabel = computed(() => {
  if (!selection.value) return 'All activities in the current report'
  const item = selection.value.type === 'month' ? monthlyItems.value.find(row => row.key === selection.value.key) : selection.value.type === 'activity' ? report.value?.activities.find(row => row.id === selection.value.key) : report.value?.suburbs.find(row => row.key === selection.value.key)
  return item?.label || item?.title || 'Selected activities'
})
const details = computed(() => (report.value?.activities || []).filter(row => !selection.value || (selection.value.type === 'month' ? row.monthKeys.includes(selection.value.key) : selection.value.type === 'activity' ? row.id === selection.value.key : row.suburb.trim().toLowerCase() === selection.value.key)))
const columns = computed(() => [
  { key: 'title', label: 'Activity' }, { key: 'startAt', label: 'Starts (Melbourne)', value: row => formatActivityTime(row.startAt), sortValue: row => row.startAt },
  { key: 'suburb', label: 'Suburb' }, { key: 'status', label: 'Status' },
  { key: 'bookings', label: 'Booked places' }, { key: 'attendance', label: 'Recorded attendance' },
  { key: 'hours', label: selection.value?.type === 'month' ? 'Hours in selected month' : 'Hours in range', value: row => selection.value?.type === 'month' ? row.hoursByMonth[selection.value.key] : row.hours }
])
const stamp = computed(() => report.value ? `${formatActivityTime(report.value.generatedAt)} (Melbourne)` : '')

function choose(type, key) { selection.value = selection.value?.type === type && selection.value.key === key ? null : { type, key } }
async function updateCharts(moveFocus = false) {
  if (!authState.user) return
  const current = ++revision
  loading.value = true; error.value = ''; report.value = null; selection.value = null
  try {
    const result = await getActivityStatistics({ ...filters })
    if (!active || current !== revision) return
    report.value = result
    if (moveFocus) focusTarget(`#${props.sectionId}-results`, { scroll: false })
  } catch (failure) {
    if (!active || current !== revision) return
    error.value = failure.code === 'functions/internal' ? 'Statistics could not be loaded. Please try again.' : failure.message || 'Statistics are unavailable. Please try again.'
    if (moveFocus) focusTarget(`#${props.sectionId}-error`)
  } finally { if (active && current === revision) loading.value = false }
}
watch(() => [authState.user?.uid, authState.user?.role], () => {
  revision++; report.value = null; selection.value = null; error.value = ''
  if (!authState.user) { loading.value = false; return }
  filters.scope = authState.user.role === 'Administrator' ? 'all' : authState.user.role === 'Coordinator' ? 'managed' : 'personal'
  filters.suburb = ''
  updateCharts()
}, { immediate: true })
watch(participationMetric, () => { if (selection.value?.type === 'activity') selection.value = null })
onUnmounted(() => { active = false; revision++ })
</script>

<template>
  <section :id="sectionId" class="admin-section activity-statistics" :aria-labelledby="`${sectionId}-title`">
    <div class="section-heading"><div><p class="eyebrow">Participation insights</p><h2 :id="`${sectionId}-title`">Statistics</h2></div></div>
    <p>Explore activity participation, completed volunteer hours and activity locations using your recorded data.</p>
    <form class="statistics-filters" @submit.prevent="updateCharts(true)" :aria-busy="loading">
      <fieldset :disabled="loading"><legend class="sr-only">Statistics filters</legend>
        <div><label :for="`${sectionId}-scope`">Data scope</label><select :id="`${sectionId}-scope`" v-model="filters.scope" class="form-select" @change="filters.suburb = ''"><option v-for="option in scopeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></div>
        <div><label :for="`${sectionId}-from`">From month</label><input :id="`${sectionId}-from`" v-model="filters.fromMonth" type="month" class="form-control" min="1970-01" max="2100-12" required @change="filters.suburb = ''" /></div>
        <div><label :for="`${sectionId}-to`">To month</label><input :id="`${sectionId}-to`" v-model="filters.toMonth" type="month" class="form-control" min="1970-01" max="2100-12" required @change="filters.suburb = ''" /></div>
        <div><label :for="`${sectionId}-suburb`">Suburb</label><select :id="`${sectionId}-suburb`" v-model="filters.suburb" class="form-select"><option value="">All suburbs</option><option v-for="suburb in report?.suburbOptions || []" :key="suburb" :value="suburb">{{ suburb }}</option></select></div>
        <button type="submit" class="statistics-button statistics-primary">{{ loading ? 'Loading…' : 'Update charts' }}</button>
      </fieldset>
    </form>
    <p class="statistics-note">Choose up to 12 months. Select Update charts to load the latest bookings and attendance.</p>
    <p v-if="pendingFilters" role="status">Filter changes have not been applied yet. Select Update charts.</p>
    <p v-if="loading" role="status">Loading statistics…</p><p v-if="error" :id="`${sectionId}-error`" class="field-error" role="alert">{{ error }}</p>
    <div v-if="report" :id="`${sectionId}-results`" tabindex="-1">
      <p class="statistics-stamp">{{ scopeLabel }} · {{ report.filters.fromMonth }} to {{ report.filters.toMonth }} · {{ report.filters.suburb || 'All suburbs' }}<br />Updated {{ stamp }}</p>
      <dl class="statistics-totals"><div v-for="item in totals" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ number(item.value) }}</dd></div></dl>
      <p v-if="!report.activities.length" class="statistics-empty" role="status">No activities match this selection. Try another month range or data scope. Recorded activity is required before the charts can show participation or hours.</p>
      <div class="statistics-grid">
        <StatisticsChart :id="`${sectionId}-hours`" class="monthly-chart" title="Monthly volunteer hours" description="Hours from completed activities with recorded attendance, split across Melbourne calendar months." :items="monthlyItems" unit="hours" vertical :selected-key="selection?.type === 'month' ? selection.key : ''" @select="choose('month', $event)" />
        <div class="participation-chart"><label :for="`${sectionId}-metric`">Compare participation by</label><select :id="`${sectionId}-metric`" v-model="participationMetric" class="form-select"><option value="bookings">Booked participants</option><option value="attendance">Recorded attendance</option></select>
          <StatisticsChart :id="`${sectionId}-people`" title="Participants by activity" :description="`Up to 10 activities ranked by ${participationMetric === 'bookings' ? 'current booked participants' : 'recorded attendance'}. A person can appear in several activities.`" :items="participationItems" unit="participants" :selected-key="selection?.type === 'activity' ? selection.key : ''" @select="choose('activity', $event)" />
        </div>
        <StatisticsChart :id="`${sectionId}-locations`" title="Activity distribution" description="Activity counts for the 10 largest suburbs in this report. The records below include all suburbs." :items="distributionItems" unit="activities" :selected-key="selection?.type === 'suburb' ? selection.key : ''" @select="choose('suburb', $event)" />
      </div>
      <section class="statistics-details" :aria-labelledby="`${sectionId}-details-title`">
        <div class="section-heading"><h3 :id="`${sectionId}-details-title`">Activity records</h3><button v-if="selection" type="button" class="statistics-button" @click="selection = null">Clear chart selection</button></div>
        <p role="status" aria-live="polite">{{ selectedLabel }} · {{ details.length }} {{ details.length === 1 ? 'record' : 'records' }}.</p>
        <p v-if="selection"><a :href="`#${sectionId}-records`">Go to filtered records</a></p>
        <div :id="`${sectionId}-records`" tabindex="-1"><InteractiveTable :key="JSON.stringify(selection)" :rows="details" :columns="columns" label="Statistics activity records" exportable /></div>
      </section>
      <details class="statistics-method"><summary>How these statistics are calculated</summary><p>Activities overlap the selected Melbourne calendar months. Booked places exclude withdrawn bookings and cancelled activities. Unique participants count each member once across the report; recorded attendance counts each attended activity. Personal statistics use only your own registrations.</p><p>Volunteer hours count the actual elapsed duration only after the activity ends and attendance is recorded. Hours crossing a month boundary are split between months, and only hours within the selected range are included. Values are rounded to two decimal places. Cancelled activities remain in the activity distribution with zero participation and hours. No names, email addresses or participant identifiers are included in the statistics response.</p></details>
    </div>
  </section>
</template>

<style scoped>
.activity-statistics { margin: 22px 0; min-width: 0; }
.activity-statistics > p { font-size: 14px; }
.statistics-filters fieldset { display: flex; align-items: end; flex-wrap: wrap; gap: 12px; min-width: 0; }
.statistics-filters fieldset > div { flex: 1 1 140px; min-width: 0; }
label { display: block; font-size: 13px; font-weight: 650; margin-bottom: 6px; }
.form-control, .form-select { font-size: 13px; }
.statistics-button { padding: 9px 12px; border: 1px solid var(--accent); border-radius: 4px; background: white; color: var(--accent); font-size: 13px; }
.statistics-primary { color: white; background: var(--accent); }
.statistics-button:focus-visible, summary:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.statistics-note, .statistics-stamp, .statistics-method p { font-size: 12px; color: var(--muted); margin-top: 12px; }
.statistics-totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(125px, 1fr)); gap: 10px; margin: 18px 0; }
.statistics-totals div { border: 1px solid var(--line); border-radius: 4px; padding: 12px; background: #f7f8fa; }
dt { font-size: 12px; color: var(--muted); font-weight: 500; } dd { font-size: 26px; color: var(--accent-strong); font-weight: 700; margin: 5px 0 0; }
.statistics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.monthly-chart { grid-column: 1 / -1; } .participation-chart { min-width: 0; }
.participation-chart > select { margin-bottom: 10px; }
.statistics-details { margin-top: 24px; min-width: 0; } h3 { font-size: 18px; }
.statistics-method { margin-top: 20px; } summary { color: var(--accent); cursor: pointer; font-size: 13px; }
.statistics-empty { padding: 15px; border: 1px solid var(--line); background: #f7f8fa; }
@media (max-width: 767px) { .statistics-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
