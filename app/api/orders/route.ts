import { NextRequest, NextResponse } from 'next/server'
import getPool from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const pool = getPool()
    
    // Query orders with aggregated line items data
    const result = await pool.query(`
      SELECT
        o.order_id,
        o.order_date,
        o.status,
        o.ship_to,
        o.total as total_all_in,
        o.week_sourced,
        o.week_msrp_percent as percent_of_msrp,
        o.tracking_status,
        o.tracking_numbers::text,
        o.shipped_via::text,
        o.expected_delivery_date as eta,
        (
          SELECT COUNT(*)
          FROM tl_line_items li
          WHERE li.order_id = o.order_id
        ) as total_items_count,
        (
          SELECT COALESCE(SUM(item_count), 0)
          FROM tl_line_items li
          WHERE li.order_id = o.order_id
        ) as total_items,
        (
          SELECT COUNT(DISTINCT pallet_id)
          FROM tl_pallets p
          WHERE p.order_id = o.order_id
        ) as total_pallets,
        (
          SELECT COALESCE(SUM(msrp), 0)
          FROM tl_line_items li
          WHERE li.order_id = o.order_id
        ) as total_msrp,
        (
          SELECT COALESCE(SUM(all_in_cost), 0)
          FROM tl_line_items li
          WHERE li.order_id = o.order_id
        ) as total_all_in_cost
      FROM tl_orders o
      ORDER BY o.order_date_parsed DESC NULLS LAST, o.order_date DESC
    `)
    
    // Format data for dashboard
    const orders = result.rows.map((row, index) => {
      // Parse tracking info
      let trackingNumbers: string[] = []
      let shippedVia: string[] = []
      
      try {
        if (row.tracking_numbers) {
          trackingNumbers = JSON.parse(row.tracking_numbers)
        }
      } catch (e) {}
      
      try {
        if (row.shipped_via) {
          shippedVia = JSON.parse(row.shipped_via)
        }
      } catch (e) {}
      
      // Filter out empty/invalid values
      trackingNumbers = trackingNumbers.filter(t => t && t.trim() && !t.includes('Tracking #'))
      shippedVia = shippedVia.filter(s => s && s.trim() && !s.includes('Tracking #'))
      
      // Map status
      const rawStatus = (row.status || '').toLowerCase()
      let status: 'Processing' | 'Shipped' | 'Delivered' | 'Pending' = 'Pending'
      if (rawStatus.includes('delivered')) status = 'Delivered'
      else if (rawStatus.includes('shipped')) status = 'Shipped'
      else if (rawStatus.includes('processing')) status = 'Processing'
      else if (rawStatus.includes('pending payment')) status = 'Pending'
      
      // Derive tracking status from available data
      let trackingStatus: 'In Transit' | 'Delivered' | 'Pending Pickup' | 'Out for Delivery' | 'Awaiting Shipment' = 'Awaiting Shipment'
      
      // First check if we have explicit tracking_status from carrier sync
      const rawTrackingStatus = (row.tracking_status || '').toLowerCase()
      if (rawTrackingStatus) {
        if (rawTrackingStatus.includes('delivered')) trackingStatus = 'Delivered'
        else if (rawTrackingStatus.includes('out for delivery')) trackingStatus = 'Out for Delivery'
        else if (rawTrackingStatus.includes('transit') || rawTrackingStatus.includes('arrived')) trackingStatus = 'In Transit'
        else if (rawTrackingStatus.includes('pickup') || rawTrackingStatus.includes('wt')) trackingStatus = 'Pending Pickup'
      } else {
        // Derive from order status and tracking info
        if (status === 'Delivered') {
          trackingStatus = 'Delivered'
        } else if (status === 'Shipped' && trackingNumbers.length > 0) {
          trackingStatus = 'In Transit'
        } else if (status === 'Shipped') {
          trackingStatus = 'Pending Pickup'
        } else {
          trackingStatus = 'Awaiting Shipment'
        }
      }
      
      return {
        id: (index + 1).toString(),
        date: row.order_date,
        orderId: row.order_id,
        status,
        shipTo: row.ship_to || 'Unknown',
        totalAllIn: parseFloat(row.total_all_in_cost) || parseFloat(row.total_all_in) || 0,
        totalMSRP: parseFloat(row.total_msrp) || 0,
        percentOfMSRP: parseFloat(row.percent_of_msrp) || 0,
        totalItems: parseInt(row.total_items) || 0,
        totalPallets: parseInt(row.total_pallets) || 0,
        trackingStatus,
        carrier: shippedVia[0] || undefined,
        trackingNumber: trackingNumbers[0] || undefined,
        eta: row.eta || undefined
      }
    })

    return NextResponse.json({
      orders,
      success: true,
      source: 'postgresql'
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
