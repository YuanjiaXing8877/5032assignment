export const PAGE_SIZE = 10
export function selectTableRows(rows, columns, search, filters, sortKey, direction) {
  const text = (value) => String(value ?? '').toLocaleLowerCase()
  const value = (row, column) => column.value ? column.value(row) : row[column.key]
  const searchable = columns.filter((column) => column.searchable !== false)
  const query = text(search).trim()
  const result = rows.filter((row) => (!query || searchable.some((column) => text(value(row, column)).includes(query))) && searchable.every((column) => text(value(row, column)).includes(text(filters[column.key]).trim())))
  const column = columns.find((item) => item.key === sortKey && item.sortable !== false)
  if (column) result.sort((a, b) => {
    const left = column.sortValue ? column.sortValue(a) : value(a, column)
    const right = column.sortValue ? column.sortValue(b) : value(b, column)
    return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left ?? '').localeCompare(String(right ?? ''), 'en', { numeric: true, sensitivity: 'base' })) * direction
  })
  return result
}
export function paginateRows(rows, requestedPage) {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const page = Math.max(1, Math.min(requestedPage, pages))
  const start = (page - 1) * PAGE_SIZE
  return { page, pages, start: rows.length ? start + 1 : 0, end: Math.min(start + PAGE_SIZE, rows.length), rows: rows.slice(start, start + PAGE_SIZE) }
}
