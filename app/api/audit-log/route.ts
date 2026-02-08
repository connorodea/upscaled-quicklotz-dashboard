import { NextResponse } from 'next/server'
import getPool from '@/lib/db'

export async function GET() {
  try {
    const pool = getPool()
    
    // Get recent order activities
    const ordersResult = await pool.query(`
      SELECT
        o.order_id,
        o.order_date,
        o.created_at,
        'order' as entity_type,
        'Order Created' as action,
        'system' as user,
        CONCAT('Order ', o.order_id, ' imported with ', 
               (SELECT COUNT(*) FROM tl_line_items WHERE order_id = o.order_id),
               ' items, ',
               (SELECT COUNT(DISTINCT pallet_id) FROM tl_pallets WHERE order_id = o.order_id),
               ' pallets') as details
      FROM tl_orders o
      ORDER BY o.created_at DESC
      LIMIT 50
    `)
    
    // Format for frontend
    const auditLogs = ordersResult.rows.map((activity, index) => ({
      id: (index + 1).toString(),
      timestamp: new Date(activity.created_at || activity.order_date).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }),
      user: activity.user,
      action: activity.action,
      entity: activity.order_id,
      entityType: activity.entity_type,
      details: activity.details
    }))
    
    return NextResponse.json({
      success: true,
      auditLogs
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
