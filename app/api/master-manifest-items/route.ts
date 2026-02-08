import { NextRequest, NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();

    // Only include manifest items for orders that exist in tl_line_items
    const orderFilter = `WHERE order_id IN (SELECT DISTINCT order_id FROM tl_line_items)`;

    const [itemsResult, summaryResult, categoryResult, topProductsResult] =
      await Promise.all([
        // All manifest items for orders that have lot-level data
        pool.query(
          `SELECT
             id,
             order_id,
             listing_id,
             listing_title,
             category,
             product_name,
             upc,
             asin,
             quantity,
             unit_retail,
             total_retail,
             order_date,
             line_item_brands,
             allocated_cogs_per_unit,
             created_at
           FROM tl_manifest_items
           ${orderFilter}
           ORDER BY order_date DESC, total_retail DESC`
        ),

        // Summary stats from lot-level data (source of truth for totals)
        pool.query(
          `SELECT
             (SELECT COUNT(DISTINCT mi.upc)
              FROM tl_manifest_items mi
              WHERE mi.upc IS NOT NULL AND mi.upc <> ''
                AND mi.order_id IN (SELECT DISTINCT order_id FROM tl_line_items)
             ) AS "totalUniqueUPCs",
             COALESCE(SUM(li.item_count), 0) AS "totalItems",
             COALESCE(SUM(li.msrp), 0) AS "totalMSRP",
             COALESCE(SUM(li.all_in_cost), 0) AS "totalAllocatedCOGS"
           FROM tl_line_items li`
        ),

        // Category breakdown from manifest items (filtered to lot-level orders)
        pool.query(
          `SELECT
             COALESCE(category, 'Uncategorized') AS category,
             SUM(quantity) AS "itemCount",
             COALESCE(SUM(total_retail), 0) AS "totalMSRP",
             COUNT(DISTINCT product_name) AS "uniqueProducts"
           FROM tl_manifest_items
           ${orderFilter}
           GROUP BY category
           ORDER BY "totalMSRP" DESC`
        ),

        // Top 20 products by total quantity across all orders (filtered)
        pool.query(
          `SELECT
             product_name,
             upc,
             SUM(quantity) AS "totalQuantity",
             COALESCE(SUM(total_retail), 0) AS "totalMSRP",
             COUNT(DISTINCT order_id) AS "orderCount"
           FROM tl_manifest_items
           WHERE order_id IN (SELECT DISTINCT order_id FROM tl_line_items)
             AND product_name IS NOT NULL AND product_name <> ''
           GROUP BY product_name, upc
           ORDER BY "totalQuantity" DESC
           LIMIT 20`
        ),
      ]);

    const summaryRow = summaryResult.rows[0];

    const summary = {
      totalUniqueUPCs: Number(summaryRow.totalUniqueUPCs),
      totalItems: Number(summaryRow.totalItems),
      totalMSRP: Number(summaryRow.totalMSRP),
      totalAllocatedCOGS: Number(summaryRow.totalAllocatedCOGS),
      categoryBreakdown: categoryResult.rows.map((row: any) => ({
        category: row.category,
        itemCount: Number(row.itemCount),
        totalMSRP: Number(row.totalMSRP),
        uniqueProducts: Number(row.uniqueProducts),
      })),
      topProducts: topProductsResult.rows.map((row: any) => ({
        productName: row.product_name,
        upc: row.upc,
        totalQuantity: Number(row.totalQuantity),
        totalMSRP: Number(row.totalMSRP),
        orderCount: Number(row.orderCount),
      })),
    };

    return NextResponse.json({
      success: true,
      items: itemsResult.rows,
      summary,
    });
  } catch (error: unknown) {
    console.error("Error fetching manifest items:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
