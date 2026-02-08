import { NextRequest, NextResponse } from 'next/server'
import getPool from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId parameter is required', success: false },
        { status: 400 }
      )
    }
    
    const pool = getPool()
    
    const result = await pool.query(`
      SELECT
        li.id as line_item_id,
        li.order_id,
        li.item_index,
        li.upd_bby_id,
        li.title,
        li.title_simplified as category,
        li.brands,
        li.condition,
        COALESCE(li.msrp, 0) as msrp,
        COALESCE(li.lot_price, 0) as lot_price,
        COALESCE(li.allocated_shipping, 0) as allocated_shipping,
        COALESCE(li.all_in_cost, 0) as all_in_cost,
        COALESCE(li.item_count, 0) as item_count,
        COALESCE(li.all_in_per_item, 0) as all_in_per_item,
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
      WHERE li.order_id = $1
      ORDER BY li.item_index
    `, [orderId])
    
    const lineItems = result.rows.map(row => ({
      lineItemId: row.line_item_id,
      orderId: row.order_id,
      itemIndex: row.item_index,
      updBbyId: row.upd_bby_id,
      title: row.title,
      category: row.category || 'General Merchandise',
      brands: row.brands,
      condition: row.condition,
      msrp: parseFloat(row.msrp),
      lotPrice: parseFloat(row.lot_price),
      allocatedShipping: parseFloat(row.allocated_shipping),
      allInCost: parseFloat(row.all_in_cost),
      itemCount: parseInt(row.item_count),
      allInPerItem: parseFloat(row.all_in_per_item),
      palletIds: row.pallet_ids || [],
      palletCount: parseInt(row.pallet_count) || 0
    }))
    
    return NextResponse.json({
      lineItems,
      success: true,
      orderId
    })
    
  } catch (error) {
    console.error('Order line items API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false
      },
      { status: 500 }
    )
  }
}
