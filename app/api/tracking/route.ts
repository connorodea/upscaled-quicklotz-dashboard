import { NextRequest, NextResponse } from "next/server"
import getPool from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")
    
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 })
    }
    
    const pool = getPool()
    
    // Get order tracking summary
    const orderResult = await pool.query(`
      SELECT 
        order_id, tracking_numbers, shipped_via, tracking_status, 
        expected_delivery_date, bill_of_lading, last_location,
        pieces, weight
      FROM tl_orders 
      WHERE order_id = $1
    `, [orderId])
    
    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    
    const order = orderResult.rows[0]
    
    // Get tracking events
    const eventsResult = await pool.query(`
      SELECT event_date, location, activity, carrier, trailer
      FROM tl_tracking_events
      WHERE order_id = $1
      ORDER BY event_date DESC
    `, [orderId])
    
    // Parse JSON arrays safely
    let trackingNumbers: string[] = []
    let shippedVia: string[] = []
    trackingNumbers = Array.isArray(order.tracking_numbers) ? order.tracking_numbers : (order.tracking_numbers ? [order.tracking_numbers] : [])
    shippedVia = Array.isArray(order.shipped_via) ? order.shipped_via : (order.shipped_via ? [order.shipped_via] : [])
    
    return NextResponse.json({
      success: true,
      order: {
        orderId: order.order_id,
        carrier: shippedVia[0] || null,
        trackingNumber: trackingNumbers[0] || null,
        trackingStatus: order.tracking_status,
        expectedDelivery: order.expected_delivery_date,
        billOfLading: order.bill_of_lading,
        lastLocation: order.last_location,
        pieces: order.pieces,
        weight: order.weight
      },
      events: eventsResult.rows.map(e => ({
        date: e.event_date,
        location: e.location,
        activity: e.activity,
        carrier: e.carrier,
        trailer: e.trailer
      }))
    })
  } catch (error) {
    console.error("Tracking API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
