import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { Pool } from 'pg'

interface Invoice {
  id: string
  invoiceNumber: string
  orderId: string
  customerID: string
  invoiceDate: string
  dueDate: string
  totalDue: number
  paymentsApplied: number
  status: string
  sourceFile: string
  eta: string | null
  palletCount: number
}

interface Order {
  order_id: string
  status: string
  total?: number
}

interface InvoiceStatusRow {
  invoice_number: string
  order_id: string | null
  status: string
  total_due: number | null
  paid_date: Date | null
  updated_at: Date
  updated_by: string
  notes: string | null
}

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Get invoice status overrides from PostgreSQL
async function getStatusOverrides(): Promise<Map<string, { status: string; updatedAt: string }>> {
  const overrides = new Map<string, { status: string; updatedAt: string }>()

  try {
    const result = await pool.query<InvoiceStatusRow>(
      'SELECT invoice_number, status, updated_at FROM invoice_status'
    )

    for (const row of result.rows) {
      overrides.set(row.invoice_number, {
        status: row.status,
        updatedAt: row.updated_at.toISOString()
      })
    }
  } catch (error) {
    console.error('Error fetching invoice status from PostgreSQL:', error)
  }

  return overrides
}



// Get order enrichment data (ETA, pallet count) from PostgreSQL
async function getOrderEnrichment(): Promise<Map<string, { eta: string | null; palletCount: number }>> {
  const enrichment = new Map<string, { eta: string | null; palletCount: number }>()

  try {
    const result = await pool.query(`
      SELECT
        o.order_id,
        o.expected_delivery_date as eta,
        (
          SELECT COUNT(DISTINCT p.pallet_id)
          FROM tl_pallets p
          WHERE p.order_id = o.order_id
        ) as pallet_count
      FROM tl_orders o
    `)

    for (const row of result.rows) {
      enrichment.set(row.order_id, {
        eta: row.eta || null,
        palletCount: parseInt(row.pallet_count) || 0,
      })
    }
  } catch (error) {
    console.error("Error fetching order enrichment from PostgreSQL:", error)
  }

  return enrichment
}

// Save invoice status to PostgreSQL (upsert)
async function saveInvoiceStatus(
  invoiceNumber: string,
  status: string,
  orderId?: string,
  totalDue?: number
): Promise<void> {
  const paidDate = status === 'Paid' ? new Date() : null

  await pool.query(
    `INSERT INTO invoice_status (invoice_number, order_id, status, total_due, paid_date, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'dashboard')
     ON CONFLICT (invoice_number)
     DO UPDATE SET
       status = EXCLUDED.status,
       paid_date = EXCLUDED.paid_date,
       updated_at = CURRENT_TIMESTAMP,
       updated_by = 'dashboard'`,
    [invoiceNumber, orderId || null, status, totalDue || null, paidDate]
  )
}

function parseAmount(value: string): number {
  if (!value) return 0
  return parseFloat(value.replace(/,/g, '').replace('$', '').trim())
}

function parseCSVLine(line: string): string[] {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: any = {}

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || ''
    }

    rows.push(row)
  }

  return rows
}

export async function GET(request: NextRequest) {
  try {
    const csvPath = process.env.INVOICES_CSV_PATH || path.join(process.cwd(), 'data', 'tl_invoices.csv')
    const ordersPath = process.env.ORDERS_JSON_PATH || '/root/upscaled-tl/data/techliquidators/orders.json'

    // Read status overrides and order enrichment from PostgreSQL
    const [statusOverrides, orderEnrichment] = await Promise.all([
      getStatusOverrides(),
      getOrderEnrichment(),
    ])

    // Read orders.json to get shipment status
    let orderStatusMap: Map<string, string> = new Map()
    try {
      const ordersContent = await fs.readFile(ordersPath, 'utf-8')
      const ordersData = JSON.parse(ordersContent)
      if (ordersData.orders && Array.isArray(ordersData.orders)) {
        ordersData.orders.forEach((order: Order) => {
          orderStatusMap.set(order.order_id, order.status)
        })
      }
    } catch (error) {
      console.error('Error reading orders.json:', error)
    }

    let fileContent: string
    try {
      fileContent = await fs.readFile(csvPath, 'utf-8')
    } catch (error) {
      console.error('Error reading invoices CSV:', error)
      return NextResponse.json({
        invoices: [],
        success: true,
        error: 'No invoices data available yet'
      })
    }

    const records = parseCSV(fileContent)

    const invoices: Invoice[] = records.map((record: any, index: number) => {
      const orderRef = record['Order Ref'] || ''
      const orderId = orderRef.replace(/^TL\s*-\s*/i, '').trim()
      const invoiceNumber = record['Invoice Number'] || ''

      const orderStatus = orderStatusMap.get(orderId)

      // Check for PostgreSQL override first, then order status, then CSV status
      let invoiceStatus = record['Status'] || 'Unknown'

      const override = statusOverrides.get(invoiceNumber)
      if (override) {
        invoiceStatus = override.status
      } else if (orderStatus && orderStatus.toLowerCase().includes('shipped')) {
        invoiceStatus = 'Paid'
      }

      let paymentsApplied = parseAmount(record['Payments Applied'])
      if (invoiceStatus === 'Paid' && paymentsApplied === 0) {
        paymentsApplied = parseAmount(record['Total Due'])
      }

      return {
        id: (index + 1).toString(),
        invoiceNumber,
        orderId,
        customerID: record['Customer ID'] || '',
        invoiceDate: record['Invoice Date'] || '',
        dueDate: record['Due Date'] || '',
        totalDue: parseAmount(record['Total Due']),
        paymentsApplied,
        status: invoiceStatus,
        sourceFile: record['Source File'] || '',
        eta: orderEnrichment.get(orderId)?.eta || null,
        palletCount: orderEnrichment.get(orderId)?.palletCount || 0,
      }
    })

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const orderIdFilter = searchParams.get('orderId')

    let filteredInvoices = invoices

    if (statusFilter && statusFilter !== 'all') {
      filteredInvoices = filteredInvoices.filter(inv =>
        inv.status.toLowerCase() === statusFilter.toLowerCase()
      )
    }

    if (orderIdFilter) {
      filteredInvoices = filteredInvoices.filter(inv =>
        inv.orderId === orderIdFilter
      )
    }

    return NextResponse.json({
      invoices: filteredInvoices,
      success: true,
      totalInvoices: invoices.length,
    })

  } catch (error) {
    console.error('Invoices API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceNumber, status, orderId, totalDue } = body

    if (!invoiceNumber || !status) {
      return NextResponse.json(
        { error: 'invoiceNumber and status are required', success: false },
        { status: 400 }
      )
    }

    if (!['Paid', 'Unpaid'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be "Paid" or "Unpaid"', success: false },
        { status: 400 }
      )
    }

    // Save to PostgreSQL
    await saveInvoiceStatus(invoiceNumber, status, orderId, totalDue)

    return NextResponse.json({
      success: true,
      invoiceNumber,
      status,
      message: `Invoice ${invoiceNumber} marked as ${status}`
    })

  } catch (error) {
    console.error('Invoice PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

// Get all invoice statuses from database (for sync purposes)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'get-all-statuses') {
      const result = await pool.query(
        'SELECT * FROM invoice_status ORDER BY updated_at DESC'
      )

      return NextResponse.json({
        success: true,
        statuses: result.rows
      })
    }

    if (action === 'bulk-update') {
      const { invoices } = body

      if (!Array.isArray(invoices)) {
        return NextResponse.json(
          { error: 'invoices must be an array', success: false },
          { status: 400 }
        )
      }

      for (const inv of invoices) {
        await saveInvoiceStatus(
          inv.invoiceNumber,
          inv.status,
          inv.orderId,
          inv.totalDue
        )
      }

      return NextResponse.json({
        success: true,
        message: `Updated ${invoices.length} invoice statuses`
      })
    }

    return NextResponse.json(
      { error: 'Invalid action', success: false },
      { status: 400 }
    )

  } catch (error) {
    console.error('Invoice POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
