import { NextRequest, NextResponse } from 'next/server'
import getPool from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const pool = getPool()

    // Get orderId from query parameters
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    const params: any[] = []
    let whereClause = ''

    if (orderId) {
      whereClause = 'WHERE li.order_id = $1'
      params.push(orderId)
    }

    const query = `
      SELECT
        li.id,
        li.order_id,
        li.order_date,
        li.upd_bby_id,
        li.title,
        li.title_simplified as category,
        li.brands,
        li.condition,
        COALESCE(li.msrp, 0) as msrp,
        COALESCE(li.lot_price, 0) as lot_price,
        COALESCE(li.allocated_shipping, 0) as allocated_shipping,
        COALESCE(li.all_in_cost, 0) as all_in_cost,
        COALESCE(li.item_count, 0) as items_count,
        COALESCE(li.all_in_percent_msrp, 0) as percent_of_msrp,
        COALESCE(li.all_in_per_item, 0) as dollar_per_item,
        (
          SELECT json_agg(p.pallet_id ORDER BY p.pallet_id)
          FROM tl_pallets p
          WHERE p.line_item_id = li.id
        ) as pallet_ids,
        (
          SELECT COUNT(DISTINCT p.pallet_id)
          FROM tl_pallets p
          WHERE p.line_item_id = li.id
        ) as pallet_count
      FROM tl_line_items li
      ${whereClause}
      ORDER BY li.order_date DESC, li.item_index
    `

    const result = await pool.query(query, params)

    // Format data for dashboard
    const lineItems = result.rows.map(row => ({
      id: row.id.toString(),
      orderId: row.order_id,
      orderDate: row.order_date || '',
      updBbyId: row.upd_bby_id || '',
      category: row.category || 'General Merchandise',
      title: row.title || '',
      brands: row.brands || '',
      condition: row.condition || '',
      msrp: parseFloat(row.msrp),
      lotPrice: parseFloat(row.lot_price),
      allocatedShipping: parseFloat(row.allocated_shipping),
      allInCost: parseFloat(row.all_in_cost),
      itemsCount: parseInt(row.items_count),
      palletIds: row.pallet_ids || [],
      palletCount: parseInt(row.pallet_count) || 0,
      percentOfMSRP: parseFloat(row.percent_of_msrp),
      dollarPerItem: parseFloat(row.dollar_per_item)
    }))

    return NextResponse.json({
      lineItems,
      success: true,
      source: 'postgresql'
    })

  } catch (error) {
    console.error('Line Items API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false
      },
      { status: 500 }
    )
  }
}
