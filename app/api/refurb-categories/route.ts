import { NextResponse } from "next/server"
import getPool from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const pool = getPool()
    
    const result = await pool.query(`
      SELECT
        category,
        COUNT(*) as item_count,
        ROUND(AVG(unit_retail)::numeric, 2) as avg_msrp,
        ROUND(AVG(allocated_cogs_per_unit)::numeric, 2) as avg_cogs_per_unit,
        ROUND(SUM(total_retail)::numeric, 2) as total_msrp,
        ROUND(SUM(allocated_cogs_per_unit * quantity)::numeric, 2) as total_cogs,
        ROUND(SUM(quantity)::numeric, 0) as total_qty
      FROM tl_manifest_items
      WHERE category IS NOT NULL AND unit_retail > 0
      GROUP BY category
      ORDER BY item_count DESC
    `)

    return NextResponse.json({
      success: true,
      categories: result.rows.map(r => ({
        category: r.category,
        itemCount: Number(r.item_count),
        avgMsrp: Number(r.avg_msrp),
        avgCogsPerUnit: Number(r.avg_cogs_per_unit),
        totalMsrp: Number(r.total_msrp),
        totalCogs: Number(r.total_cogs),
        totalQty: Number(r.total_qty),
      })),
    })
  } catch (error) {
    console.error("Error fetching refurb categories:", error)
    return NextResponse.json({ success: false, categories: [] })
  }
}
