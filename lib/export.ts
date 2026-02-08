/**
 * Data Export Utilities
 * Provides CSV and Excel export functionality for data tables
 */

export interface ExportColumn {
  key: string
  header: string
  format?: (value: any) => string
}

/**
 * Convert data array to CSV string
 */
export function toCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[]
): string {
  if (data.length === 0) return ""

  // Header row
  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`)
  const headerRow = headers.join(",")

  // Data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const value = item[col.key]
        const formatted = col.format ? col.format(value) : String(value ?? "")
        // Escape quotes and wrap in quotes
        return `"${formatted.replace(/"/g, '""')}"`
      })
      .join(",")
  })

  return [headerRow, ...rows].join("\n")
}

/**
 * Download data as CSV file
 */
export function downloadCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  const csv = toCSV(data, columns)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download data as Excel-compatible CSV (with BOM for proper UTF-8)
 */
export function downloadExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  const csv = toCSV(data, columns)
  // Add BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF"
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format currency for export
 */
export function formatCurrencyExport(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
}

/**
 * Format date for export
 */
export function formatDateExport(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  } catch {
    return dateStr
  }
}

/**
 * Format number for export
 */
export function formatNumberExport(value: number): string {
  return new Intl.NumberFormat("en-US").format(value || 0)
}

/**
 * Format percent for export
 */
export function formatPercentExport(value: number): string {
  return `${(value || 0).toFixed(2)}%`
}
