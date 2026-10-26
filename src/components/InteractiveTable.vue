<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { paginateRows, selectTableRows } from '../utils/table'
import { createCsv, createExportSnapshot, downloadBlob, exportFilename } from '../utils/export'
const props = defineProps({ rows: { type: Array, required: true }, columns: { type: Array, required: true }, label: { type: String, required: true }, rowKey: { type: String, default: 'id' }, exportable: { type: Boolean, default: false } })
const search = ref('')
const filters = reactive({})
const sortKey = ref('')
const direction = ref(1)
const requestedPage = ref(1)
const exporting = ref('')
const exportError = ref('')
const exportMessage = ref('')
const selected = computed(() => selectTableRows(props.rows, props.columns, search.value, filters, sortKey.value, direction.value))
const pagination = computed(() => paginateRows(selected.value, requestedPage.value))
const hasFilters = computed(() => Boolean(search.value || Object.values(filters).some(Boolean)))
watch([search, filters, sortKey, direction], () => { requestedPage.value = 1 }, { flush: 'sync' })
watch(() => pagination.value.page, (page) => { requestedPage.value = page })
function sort(column) {
  if (sortKey.value === column.key) direction.value *= -1
  else { sortKey.value = column.key; direction.value = 1 }
}
function clear() {
  search.value = ''
  Object.keys(filters).forEach((key) => { delete filters[key] })
  requestedPage.value = 1
}
async function exportRows(format, event) {
  if (exporting.value || !selected.value.length) return
  const button = event.currentTarget
  exporting.value = format; exportError.value = ''; exportMessage.value = ''
  try {
    const snapshot = createExportSnapshot(selected.value, props.columns, { title: props.label, filtered: hasFilters.value })
    let blob
    if (format === 'csv') blob = new Blob([createCsv(snapshot)], { type: 'text/csv;charset=utf-8' })
    else {
      const { createPdfDocument, loadExportFont } = await import('../utils/exportPdf')
      const font = await loadExportFont()
      if (!button.isConnected) return
      blob = createPdfDocument(snapshot, font).output('blob')
    }
    downloadBlob(blob, exportFilename(snapshot, format))
    exportMessage.value = `${format.toUpperCase()} download started: ${snapshot.rows.length} ${snapshot.rows.length === 1 ? 'record' : 'records'}.`
  } catch {
    exportError.value = 'Unable to create the export. Please check your connection and try again.'
  } finally {
    exporting.value = ''
    await nextTick()
    if (button.isConnected && document.activeElement === document.body) button.focus({ preventScroll: true })
  }
}
</script>
<template>
  <div class="interactive-table">
    <div class="table-toolbar">
      <label class="table-search"><span>Search {{ label.toLowerCase() }}</span><input v-model="search" type="search" class="form-control" placeholder="Search all columns" /></label>
      <div class="table-actions">
        <button type="button" class="table-control" :disabled="!hasFilters" @click="clear">Clear search</button>
        <div v-if="exportable" class="export-buttons" role="group" :aria-label="`Export ${label.toLowerCase()}`" :aria-busy="Boolean(exporting)">
          <button type="button" class="table-control" :disabled="!selected.length || Boolean(exporting)" @click="exportRows('csv', $event)">{{ exporting === 'csv' ? 'Preparing CSV…' : 'Export CSV' }}</button>
          <button type="button" class="table-control" :disabled="!selected.length || Boolean(exporting)" @click="exportRows('pdf', $event)">{{ exporting === 'pdf' ? 'Preparing PDF…' : 'Export PDF' }}</button>
        </div>
      </div>
    </div>
    <template v-if="exportable">
      <p class="export-help">{{ selected.length ? `Exports all ${selected.length} matching records across all pages, in the current sort order.` : 'No records to export.' }}</p>
      <p class="export-feedback" role="status" aria-live="polite">{{ exporting ? `Preparing ${exporting.toUpperCase()} export…` : exportMessage }}</p>
      <p v-if="exportError" class="field-error" role="alert">{{ exportError }}</p>
    </template>
    <div class="table-wrap" role="region" :aria-label="`${label} table`" tabindex="0">
      <table>
        <caption class="sr-only">{{ label }}. Sort using column headings or search using the fields below each heading. Up to 10 rows per page.</caption>
        <thead>
          <tr><th v-for="column in columns" :key="column.key" scope="col" :aria-sort="column.sortable === false ? undefined : sortKey === column.key ? (direction === 1 ? 'ascending' : 'descending') : 'none'">
            <button v-if="column.sortable !== false" type="button" class="table-sort" @click="sort(column)">{{ column.label }} <span aria-hidden="true">{{ sortKey === column.key ? (direction === 1 ? '↑' : '↓') : '↕' }}</span></button><span v-else>{{ column.label }}</span>
          </th></tr>
          <tr class="table-filter-row"><td v-for="column in columns" :key="column.key"><input v-if="column.searchable !== false" v-model="filters[column.key]" type="search" class="form-control column-search" :aria-label="`${label}: search ${column.label}`" :placeholder="`Search ${column.label.toLowerCase()}`" /></td></tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in pagination.rows" :key="row[rowKey]">
            <td v-for="column in columns" :key="column.key">
              <slot :name="column.key" :row="row" :number="pagination.start + index">{{ column.value ? column.value(row) : row[column.key] }}</slot>
            </td>
          </tr>
          <tr v-if="!selected.length"><td :colspan="columns.length" class="empty-table">{{ rows.length ? 'No matching records. Try changing or clearing your search.' : 'No records available.' }}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="table-pagination">
      <span role="status" aria-live="polite">{{ pagination.start }}–{{ pagination.end }} of {{ selected.length }} records · 10 per page</span>
      <nav :aria-label="`${label} pagination`">
        <button class="table-control" type="button" :disabled="pagination.page === 1" @click="requestedPage = 1">First</button>
        <button class="table-control" type="button" :disabled="pagination.page === 1" @click="requestedPage = pagination.page - 1">Previous</button>
        <span>Page {{ pagination.page }} of {{ pagination.pages }}</span>
        <button class="table-control" type="button" :disabled="pagination.page === pagination.pages" @click="requestedPage = pagination.page + 1">Next</button>
        <button class="table-control" type="button" :disabled="pagination.page === pagination.pages" @click="requestedPage = pagination.pages">Last</button>
      </nav>
    </div>
  </div>
</template>
<style scoped>
.interactive-table { min-width: 0; }
.table-toolbar, .table-pagination, .table-pagination nav { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.table-toolbar { justify-content: space-between; margin: 12px 0; }
.table-actions, .export-buttons { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.export-help, .export-feedback { margin: 6px 0; color: var(--muted); font-size: 12px; }
.export-feedback:empty { margin: 0; }
.table-search { width: min(100%, 340px); font-size: 13px; font-weight: 650; }
.table-search span { display: block; margin-bottom: 6px; }
.form-control { font-size: 13px; }
.column-search { min-width: 130px; font-weight: 400; }
th { background: #f0efeb; color: #354153; }
.table-filter-row td { background: #f0efeb; }
.table-sort { border: 0; padding: 0; color: inherit; background: transparent; font: inherit; font-weight: 700; display: flex; align-items: center; gap: 10px; white-space: nowrap; text-align: left; }
.table-control { border: 1px solid #737f8d; border-radius: 4px; padding: 7px 10px; background: white; color: var(--accent); font-size: 12px; white-space: nowrap; }
.table-control:disabled { opacity: .5; cursor: default; }
button:focus-visible, .table-wrap:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.table-pagination { justify-content: space-between; margin: 14px 0; color: var(--muted); font-size: 12px; }
tbody tr:nth-child(even) { background: #f7f6f3; }
@media (max-width: 575px) { .table-pagination nav { gap: 6px; } .table-control { padding: 7px; } }
</style>
