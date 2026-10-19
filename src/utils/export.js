const cleanText = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

export function createExportSnapshot(rows, columns, { title, filtered = false, date = new Date() }) {
  const fields = columns.filter(column => column.exportable !== false)
  if (!rows.length || !fields.length) throw new Error('No records available to export.')
  return {
    title: cleanText(title),
    exportedAt: date.toISOString(),
    scope: filtered ? 'Filtered results' : 'All records',
    headers: fields.map(column => cleanText(column.label)),
    rows: rows.map(row => fields.map(column => {
      const value = column.exportValue ? column.exportValue(row) : column.value ? column.value(row) : row[column.key]
      if (typeof value === 'number') return Number.isFinite(value) ? value : ''
      if (value !== null && typeof value === 'object') throw new Error('An export field needs a text value.')
      return cleanText(value)
    }))
  }
}

function csvCell(value) {
  let text = String(value)
  // Spreadsheet applications may evaluate text beginning with a formula or control character.
  if (typeof value !== 'number' && (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function createCsv(snapshot) {
  return '\uFEFF' + [snapshot.headers, ...snapshot.rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function exportFilename(snapshot, extension) {
  const slug = snapshot.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'records'
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(snapshot.exportedAt))
  const date = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `greenlink-${slug}-${date.year}-${date.month}-${date.day}.${extension}`
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.hidden = true
  document.body.append(link)
  try {
    link.click()
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  } finally {
    link.remove()
  }
  // Keep the URL alive while the browser starts the download, including Safari.
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
