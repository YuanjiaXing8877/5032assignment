import test from 'node:test'
import assert from 'node:assert/strict'
import { selectTableRows, paginateRows } from '../src/utils/table.js'
const columns = [{ key: 'name' }, { key: 'suburb' }, { key: 'hours' }, { key: 'date', sortValue: (row) => Date.parse(row.date) }]
const rows = Array.from({ length: 23 }, (_, id) => ({ id, name: `Activity ${id}`, suburb: id % 2 ? 'Albion' : 'Footscray', hours: id, date: id < 12 ? '22 Aug 2026' : '12 Jul 2026' }))
test('column searches combine with global search and ignore case', () => {
  const result = selectTableRows(rows, columns, 'ACTIVITY 1', { suburb: ' albion ' }, '', 1)
  assert.deepEqual(result.map((row) => row.id), [1, 11, 13, 15, 17, 19])
  assert.equal(selectTableRows(rows, columns, '', { name: 'Albion' }, '', 1).length, 0)
})
test('numbers and dates sort by value without mutating source data', () => {
  assert.equal(selectTableRows(rows, columns, '', {}, 'hours', -1)[0].hours, 22)
  assert.equal(selectTableRows(rows, columns, '', {}, 'date', 1)[0].date, '12 Jul 2026')
  assert.equal(rows[0].id, 0)
})
test('pagination limits every page to 10 and clamps after filtering', () => {
  assert.equal(paginateRows(rows, 1).rows.length, 10)
  assert.equal(paginateRows(rows, 2).rows[0].id, 10)
  assert.equal(paginateRows(rows, 3).rows.length, 3)
  assert.equal(paginateRows(rows.slice(0, 2), 3).page, 1)
  assert.deepEqual(paginateRows([], 5), { page: 1, pages: 1, start: 0, end: 0, rows: [] })
})
