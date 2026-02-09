import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

interface SyncStatus {
  lastSync: string | null
  ordersCount: number
  invoicesCount: number
  lineItemsCount: number
  status: "healthy" | "stale" | "error"
  message: string
}

export async function GET() {
  try {
    const dataDir = process.env.DATA_DIR || "/root/upscaled-tl-data/data"
    const ordersPath = path.join(dataDir, "techliquidators", "orders.json")

    let lastSync: string | null = null
    let ordersCount = 0
    let status: "healthy" | "stale" | "error" = "healthy"
    let message = "Data is up to date"

    // Check orders.json file modification time
    if (fs.existsSync(ordersPath)) {
      const stats = fs.statSync(ordersPath)
      lastSync = stats.mtime.toISOString()

      // Read orders count
      try {
        const ordersData = JSON.parse(fs.readFileSync(ordersPath, "utf-8"))
        ordersCount = Array.isArray(ordersData) ? ordersData.length : 0
      } catch (e) {
        console.error("Error parsing orders.json:", e)
      }

      // Check if data is stale (more than 24 hours old)
      const hoursSinceSync = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60)
      if (hoursSinceSync > 24) {
        status = "stale"
        message = `Data is ${Math.floor(hoursSinceSync)} hours old`
      } else if (hoursSinceSync > 1) {
        message = `Synced ${Math.floor(hoursSinceSync)} hours ago`
      } else {
        const minutesSinceSync = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60))
        message = minutesSinceSync < 1 ? "Just synced" : `Synced ${minutesSinceSync} min ago`
      }
    } else {
      status = "error"
      message = "Orders data not found"
    }

    // Count invoices
    let invoicesCount = 0
    const invoicesPath = path.join(dataDir, "tl_invoices.csv")
    if (fs.existsSync(invoicesPath)) {
      try {
        const invoicesData = fs.readFileSync(invoicesPath, "utf-8")
        invoicesCount = invoicesData.split("\n").length - 1 // Subtract header
      } catch (e) {
        console.error("Error reading invoices:", e)
      }
    }

    // Count line items from order manifests
    let lineItemsCount = 0
    const manifestsDir = path.join(dataDir, "techliquidators", "order_manifests")
    if (fs.existsSync(manifestsDir)) {
      try {
        const files = fs.readdirSync(manifestsDir)
        lineItemsCount = files.filter((f) => f.endsWith(".xlsx")).length
      } catch (e) {
        console.error("Error reading manifests:", e)
      }
    }

    const syncStatus: SyncStatus = {
      lastSync,
      ordersCount,
      invoicesCount,
      lineItemsCount,
      status,
      message,
    }

    return NextResponse.json({ success: true, ...syncStatus })
  } catch (error) {
    console.error("Error getting sync status:", error)
    return NextResponse.json(
      {
        success: false,
        lastSync: null,
        ordersCount: 0,
        invoicesCount: 0,
        lineItemsCount: 0,
        status: "error",
        message: "Failed to get sync status",
      },
      { status: 500 }
    )
  }
}
