/**
 * Export array of objects as CSV file download
 */
export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) return

  // Get all unique keys from data
  const headers = [...new Set(data.flatMap(row => Object.keys(row)))]
  
  // Filter out nested objects/arrays — only keep primitive values
  const flatHeaders = headers.filter(h => {
    const sample = data.find(row => row[h] != null)
    if (!sample) return false
    const val = sample[h]
    return typeof val !== 'object' || val === null
  })

  const csvRows = []
  
  // Header row
  csvRows.push(flatHeaders.map(h => `"${h}"`).join(','))
  
  // Data rows
  data.forEach(row => {
    const values = flatHeaders.map(h => {
      let val = row[h]
      if (val === null || val === undefined) val = ''
      // Escape quotes
      val = String(val).replace(/"/g, '""')
      return `"${val}"`
    })
    csvRows.push(values.join(','))
  })

  const csvContent = csvRows.join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Format orders data for CSV export
 */
export function formatOrdersForExport(orders) {
  return orders.map(o => ({
    'Customer': o.customers?.name || '',
    'Phone': o.customers?.phone || '',
    'Item': o.item_name || '',
    'Fabric': o.fabric || '',
    'Total Price': o.total_price || 0,
    'Advance Paid': o.advance_paid || 0,
    'Balance': (o.total_price || 0) - (o.advance_paid || 0),
    'Status': o.status || '',
    'Worker': o.workers?.name || '',
    'Due Date': o.due_date || '',
    'Notes': o.notes || '',
    'Created': o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
  }))
}

/**
 * Format customers data for CSV export
 */
export function formatCustomersForExport(customers) {
  return customers.map(c => ({
    'Name': c.name || '',
    'Phone': c.phone || '',
    'Address': c.address || '',
    'Created': c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
  }))
}
