import test from 'node:test'
import assert from 'node:assert/strict'
import { createCsv, createExportSnapshot, exportFilename } from '../src/utils/export.js'
import { selectTableRows, paginateRows } from '../src/utils/table.js'

const date = new Date('2026-10-18T14:30:00Z')
const columns = [{ key: 'title', label: 'Activity' }, { key: 'hours', label: 'Hours' }, { key: 'action', label: 'Action', exportable: false }]

test('exports every matching row in current sort order, including other pages, using only declared fields', () => {
  const rows = Array.from({ length: 27 }, (_, id) => ({ id, title: id < 23 ? `Planting ${id}` : 'Other', hours: id, action: 'Book', privateField: 'never exported' }))
  const selected = selectTableRows(rows, columns, '', { title: 'Planting' }, 'hours', -1)
  const snapshot = createExportSnapshot(selected, columns, { title: 'Available activities', date, filtered: true })
  assert.equal(paginateRows(selected, 2).rows.length, 10)
  assert.equal(snapshot.rows.length, 23)
  assert.deepEqual(snapshot.rows[0], ['Planting 22', 22])
  assert.deepEqual(snapshot.rows.at(-1), ['Planting 0', 0])
  assert.deepEqual(snapshot.headers, ['Activity', 'Hours'])
  assert.equal(snapshot.scope, 'Filtered results')
  rows[22].title = 'Changed after export began'
  assert.equal(snapshot.rows[0][0], 'Planting 22')
  assert.ok(!createCsv(snapshot).includes('never exported'))
})

test('CSV preserves Unicode, quoted commas, multiline cells and zero values with Excel UTF-8 BOM', () => {
  const snapshot = createExportSnapshot([{ title: '植树, "河岸"\nCommunity planting', hours: 0 }], columns, { title: 'Activity history', date })
  const csv = createCsv(snapshot)
  assert.equal(csv, '\uFEFF"Activity","Hours"\r\n"植树, ""河岸""\nCommunity planting","0"\r\n')
})

test('CSV neutralises formula-like text and leading spreadsheet controls without changing numeric values', () => {
  for (const value of ['=1+1', '+SUM(A1:A3)', '-1+2', '@SUM(A1)', '  =1', '\ttext', '\rtext', '\ntext', '\u0001=1']) {
    const csv = createCsv(createExportSnapshot([{ title: value, hours: -2 }], columns, { title: 'Activities', date }))
    assert.ok(csv.split('\r\n')[1].startsWith('"\''), JSON.stringify(value))
    assert.ok(csv.includes(',"-2"'))
  }
})

test('formatted values, empty values and Melbourne-dated filenames are deterministic', () => {
  const snapshot = createExportSnapshot([{ title: 'Planting', hours: 0 }], [
    { key: 'title', label: 'Activity', exportValue: row => `${row.title} 中文` },
    { key: 'missing', label: 'Empty' },
    { key: 'hours', label: 'Duration', value: row => `${row.hours} hours` }
  ], { title: 'Available activities / list', date })
  assert.deepEqual(snapshot.rows, [['Planting 中文', '', '0 hours']])
  assert.equal(exportFilename(snapshot, 'csv'), 'greenlink-available-activities-list-2026-10-19.csv')
  assert.throws(() => createExportSnapshot([], columns, { title: 'Empty', date }), /No records/)
})
