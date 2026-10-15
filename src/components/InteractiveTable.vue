<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { paginateRows, selectTableRows } from '../utils/table'
const props = defineProps({ rows: { type: Array, required: true }, columns: { type: Array, required: true }, label: { type: String, required: true }, rowKey: { type: String, default: 'id' } })
const search = ref('')
const filters = reactive({})
const sortKey = ref('')
const direction = ref(1)
const requestedPage = ref(1)
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
</script>
<template>
  <div class="interactive-table">
    <div class="table-toolbar">
      <label class="table-search"><span>Search {{ label.toLowerCase() }}</span><input v-model="search" type="search" class="form-control" placeholder="Search all columns" /></label>
      <button type="button" class="table-control" :disabled="!hasFilters" @click="clear">Clear search</button>
    </div>
    <div class="table-wrap" role="region" :aria-label="label" tabindex="0">
      <table>
        <caption class="sr-only">{{ label }}. Sort using column headings or search using the fields below each heading. Up to 10 rows per page.</caption>
        <thead>
          <tr><th v-for="column in columns" :key="column.key" scope="col" :aria-sort="column.sortable === false ? undefined : sortKey === column.key ? (direction === 1 ? 'ascending' : 'descending') : 'none'">
            <button v-if="column.sortable !== false" type="button" class="table-sort" @click="sort(column)">{{ column.label }} <span aria-hidden="true">{{ sortKey === column.key ? (direction === 1 ? '↑' : '↓') : '↕' }}</span></button><span v-else>{{ column.label }}</span>
          </th></tr>
          <tr><th v-for="column in columns" :key="column.key"><input v-if="column.searchable !== false" v-model="filters[column.key]" type="search" class="form-control column-search" :aria-label="`${label}: search ${column.label}`" :placeholder="`Search ${column.label.toLowerCase()}`" /></th></tr>
        </thead>
        <tbody>
          <tr v-for="row in pagination.rows" :key="row[rowKey]"><td v-for="column in columns" :key="column.key"><slot :name="column.key" :row="row">{{ column.value ? column.value(row) : row[column.key] }}</slot></td></tr>
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
.table-search { width: min(100%, 340px); font-size: 13px; font-weight: 650; }
.table-search span { display: block; margin-bottom: 6px; }
.form-control { font-size: 13px; }
.column-search { min-width: 130px; font-weight: 400; }
th { background: #edf1ef; color: #44524b; }
.table-sort { border: 0; padding: 0; color: inherit; background: transparent; font: inherit; font-weight: 700; display: flex; align-items: center; gap: 10px; white-space: nowrap; text-align: left; }
.table-control { border: 1px solid #879c90; border-radius: 4px; padding: 7px 10px; background: white; color: var(--green-800); font-size: 12px; }
.table-control:disabled { opacity: .5; cursor: default; }
button:focus-visible, .table-wrap:focus-visible { outline: 2px solid var(--green-700); outline-offset: 3px; }
.table-pagination { justify-content: space-between; margin: 14px 0; color: var(--muted); font-size: 12px; }
tbody tr:nth-child(even) { background: #f7f9f8; }
@media (max-width: 575px) { .table-pagination nav { gap: 6px; } .table-control { padding: 7px; } }
</style>
