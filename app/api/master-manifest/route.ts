import { NextRequest, NextResponse } from "next/server"
import getPool from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const pool = getPool()

    const query = `
      SELECT
        o.order_id,
        o.order_date,
        o.week_sourced,
        o.week_msrp_percent,
        o.status as order_status,
        o.ship_to,
        li.id as line_item_id,
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
        COALESCE(li.all_in_percent_msrp, 0) as all_in_percent_msrp,
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
      FROM tl_orders o
      JOIN tl_line_items li ON o.order_id = li.order_id
      ORDER BY o.order_date DESC, li.item_index
    `

    const result = await pool.query(query)

    const manifestItems = result.rows.map(row => ({
      orderId: row.order_id,
      orderDate: row.order_date,
      weekSourced: row.week_sourced,
      weekMsrpPercent: parseFloat(row.week_msrp_percent) || 0,
      orderStatus: row.order_status,
      shipTo: row.ship_to,
      lineItemId: row.line_item_id,
      itemIndex: row.item_index,
      updBbyId: row.upd_bby_id,
      title: row.title,
      category: row.category || "General Merchandise",
      brands: row.brands,
      condition: row.condition,
      msrp: parseFloat(row.msrp),
      lotPrice: parseFloat(row.lot_price),
      allocatedShipping: parseFloat(row.allocated_shipping),
      allInCost: parseFloat(row.all_in_cost),
      itemCount: parseInt(row.item_count),
      allInPercentMsrp: parseFloat(row.all_in_percent_msrp),
      allInPerItem: parseFloat(row.all_in_per_item),
      palletIds: row.pallet_ids || [],
      palletCount: parseInt(row.pallet_count) || 0,
    }))

    return NextResponse.json({
      manifestItems,
      success: true,
      totalItems: manifestItems.length,
      source: "postgresql",
    })
  } catch (error) {
    console.error("Master manifest API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        success: false,
      },
      { status: 500 }
    )
  }
}
