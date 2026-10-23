import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

const fontUrl = new URL('../assets/fonts/GreenLinkSans-Regular.ttf', import.meta.url).href
let fontPromise

export function loadExportFont() {
  if (!fontPromise) {
    fontPromise = fetch(fontUrl).then(response => {
      if (!response.ok) throw new Error('Unable to load the PDF font. Please check your connection and try again.')
      return response.arrayBuffer()
    }).then(data => new Uint8Array(data)).catch(error => { fontPromise = null; throw error })
  }
  return fontPromise
}

function binaryString(bytes) {
  let result = ''
  for (let offset = 0; offset < bytes.length; offset += 8192) result += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  return result
}

export function createPdfDocument(snapshot, fontBytes) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true })
  doc.addFileToVFS('GreenLinkSans-Regular.ttf', binaryString(fontBytes))
  doc.addFont('GreenLinkSans-Regular.ttf', 'GreenLinkSans', 'normal')
  doc.setFont('GreenLinkSans', 'normal')
  doc.setProperties({ title: `GreenLink - ${snapshot.title}`, subject: `${snapshot.scope}: ${snapshot.rows.length} records`, author: 'GreenLink Melbourne', creator: 'GreenLink' })
  doc.setLanguage('en-AU')
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const stamp = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(snapshot.exportedAt))

  doc.setTextColor('#172b4d').setFontSize(16).text('GreenLink Melbourne', 14, 15)
  doc.setFontSize(11).text(snapshot.title, 14, 23)
  doc.setTextColor('#566273').setFontSize(8)
  doc.text(`Exported ${stamp} (Melbourne)`, 14, 29)
  doc.text(`${snapshot.scope} | ${snapshot.rows.length} records | All matching pages included`, 14, 34)

  autoTable(doc, {
    head: [snapshot.headers], body: snapshot.rows.map(row => row.map(String)),
    startY: 40, margin: { top: 22, right: 14, bottom: 18, left: 14 },
    styles: { font: 'GreenLinkSans', fontStyle: 'normal', fontSize: 8, cellPadding: 2.4, overflow: 'linebreak', textColor: '#202b3c', lineColor: '#d8d6d0', lineWidth: .1 },
    headStyles: { fillColor: '#234e70', textColor: '#ffffff', fontStyle: 'normal' },
    alternateRowStyles: { fillColor: '#f3f6f4' },
    showHead: 'everyPage', rowPageBreak: 'avoid',
    willDrawPage: ({ pageNumber }) => {
      if (pageNumber > 1) doc.setFont('GreenLinkSans', 'normal').setFontSize(9).setTextColor('#172b4d').text(`GreenLink Melbourne | ${snapshot.title}`, 14, 14)
    }
  })
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setDrawColor('#d8d6d0').setLineWidth(.2).line(14, height - 13, width - 14, height - 13)
    doc.setFont('GreenLinkSans', 'normal').setFontSize(8).setTextColor('#566273')
    doc.text(`${snapshot.rows.length} records`, 14, height - 8)
    doc.text(`Page ${page} of ${pages}`, width - 14, height - 8, { align: 'right' })
  }
  return doc
}
