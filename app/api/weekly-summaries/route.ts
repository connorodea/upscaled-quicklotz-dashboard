import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

interface WeeklySummary {
  id: string
  periodStart: string
  periodEnd: string
  totalOrders: number
  totalMSRP: number
  totalItems: number
  totalPallets: number
  totalAllIn: number
  allInPercentMSRP: number
  allInPerItem: number
}

function parseAmount(value: string): number {
  if (!value) return 0
  return parseFloat(value.replace(/,/g, '').replace('$', '').trim())
}

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row: any = {}

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ? values[j].trim() : ''
    }

    rows.push(row)
  }

  return rows
}

export async function GET(request: NextRequest) {
  try {
    const csvPath = process.env.SUMMARIES_CSV_PATH || path.join(process.cwd(), 'data', 'upscaled_tl_sourcing_summary.csv')

    let fileContent: string
    try {
      fileContent = await fs.readFile(csvPath, 'utf-8')
    } catch (error) {
      console.error('Error reading summaries CSV:', error)
      return NextResponse.json({
        summaries: [],
        success: true,
        error: 'No summaries data available yet'
      })
    }

    // Parse CSV
    const records = parseCSV(fileContent)

    // Transform to summary objects
    const summaries: WeeklySummary[] = records.map((record: any, index: number) => ({
      id: (index + 1).toString(),
      periodStart: record['Period Start'] || '',
      periodEnd: record['Period End'] || '',
      totalOrders: parseInt(record['Total Orders']) || 0,
      totalMSRP: parseAmount(record['Total MSRP']),
      totalItems: parseInt(record['Total Items']) || 0,
      totalPallets: parseInt(record['Total Pallets']) || 0,
      totalAllIn: parseAmount(record['Total All-in']),
      allInPercentMSRP: parseFloat(record['All-in % of MSRP']) || 0,
      allInPerItem: parseAmount(record['All-in $/Item']),
    }))

    return NextResponse.json({
      summaries,
      success: true,
      totalWeeks: summaries.length,
    })

  } catch (error) {
    console.error('Weekly Summaries API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
