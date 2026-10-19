import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createExportSnapshot } from '../src/utils/export.js'
import { createPdfDocument } from '../src/utils/exportPdf.js'

test('PDF embeds the bundled font, paginates long bilingual tables and sets report metadata', () => {
  const rows = Array.from({ length: 120 }, (_, id) => ({
    title: `河岸植树活动 ${id + 1} - Community planting`,
    address: 'Footscray Park, riverside meeting point near the entrance. Please bring drinking water and comfortable walking shoes.',
    hours: 2.5
  }))
  const snapshot = createExportSnapshot(rows, [
    { key: 'title', label: 'Activity' }, { key: 'address', label: 'Meeting point' }, { key: 'hours', label: 'Hours' }
  ], { title: 'Available activities', date: new Date('2026-10-19T03:00:00Z') })
  const font = readFileSync(new URL('../src/assets/fonts/GreenLinkSans-Regular.ttf', import.meta.url))
  const doc = createPdfDocument(snapshot, font)
  assert.ok(doc.getNumberOfPages() > 2)
  assert.deepEqual(doc.getFontList().GreenLinkSans, ['normal'])
  assert.ok(doc.getTextWidth('河岸植树活动') > 0)
  const pdf = doc.output()
  assert.ok(pdf.includes('/FontFile2'))
  assert.ok(pdf.includes('/ToUnicode'))
  assert.ok(pdf.includes('/Author (GreenLink Melbourne)'))
  assert.ok(pdf.includes('/Creator (GreenLink)'))
})
