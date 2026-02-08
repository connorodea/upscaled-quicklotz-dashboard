import { NextResponse } from "next/server"
import getPool from "@/lib/db"

// --- eBay OAuth token cache ---
let cachedToken: { token: string; expiresAt: number } | null = null

async function getEbayToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const clientId = process.env.EBAY_CLIENT_ID
  const clientSecret = process.env.EBAY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set")
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`eBay OAuth failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000, // refresh 5 min early
  }
  return cachedToken.token
}

// --- Comps query cache (4-hour TTL) ---
const compsCache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL = 4 * 60 * 60 * 1000

async function searchEbaySold(
  query: string,
  token: string
): Promise<{ medianPrice: number; soldCount: number; prices: number[] }> {
  const cacheKey = query.toLowerCase().trim()
  const cached = compsCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const filterStr = `soldItems,startTime:[${ninetyDaysAgo.toISOString()}..${now.toISOString()}]`

  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search")
  url.searchParams.set("q", query)
  url.searchParams.set("filter", filterStr)
  url.searchParams.set("limit", "50")
  url.searchParams.set("sort", "-endDate")

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          "Content-Type": "application/json",
        },
      })

      if (res.status === 429) {
        // rate limited — wait and retry
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`eBay search failed: ${res.status} ${text}`)
      }

      const data = await res.json()
      const items = data.itemSummaries || []

      const prices: number[] = []
      for (const item of items) {
        const price = parseFloat(item.price?.value || "0")
        const shipping = parseFloat(item.shippingOptions?.[0]?.shippingCost?.value || "0")
        if (price > 0) {
          prices.push(price + shipping)
        }
      }

      prices.sort((a, b) => a - b)
      const medianPrice =
        prices.length > 0
          ? prices.length % 2 === 0
            ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
            : prices[Math.floor(prices.length / 2)]
          : 0

      const result = { medianPrice, soldCount: prices.length, prices }
      compsCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL })
      return result
    } catch (e) {
      lastError = e as Error
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }

  // Return empty on failure rather than crashing
  console.error(`eBay search failed for "${query}":`, lastError)
  return { medianPrice: 0, soldCount: 0, prices: [] }
}

// --- Main handler ---
export async function GET() {
  try {
    // 1. Fetch manifest items from DB
    const pool = getPool()
    const result = await pool.query(`
      SELECT
        li.title_simplified as category,
        li.brands,
        COALESCE(li.msrp, 0) as msrp,
        COALESCE(li.all_in_cost, 0) as all_in_cost,
        COALESCE(li.item_count, 0) as item_count
      FROM tl_orders o
      JOIN tl_line_items li ON o.order_id = li.order_id
      ORDER BY o.order_date DESC
    `)

    // 2. Group by category
    const categoryMap = new Map<
      string,
      {
        itemCount: number
        totalMSRP: number
        totalCOGS: number
        brands: Map<string, number>
        titles: string[]
      }
    >()

    for (const row of result.rows) {
      const cat = row.category || "General Merchandise"
      const entry = categoryMap.get(cat) || {
        itemCount: 0,
        totalMSRP: 0,
        totalCOGS: 0,
        brands: new Map<string, number>(),
        titles: [],
      }
      const count = parseInt(row.item_count) || 1
      entry.itemCount += count
      entry.totalMSRP += parseFloat(row.msrp) || 0
      entry.totalCOGS += parseFloat(row.all_in_cost) || 0
      if (row.brands) {
        const b = row.brands.split(",")[0].trim()
        entry.brands.set(b, (entry.brands.get(b) || 0) + count)
      }
      categoryMap.set(cat, entry)
    }

    // 3. Get eBay token
    let token: string
    try {
      token = await getEbayToken()
    } catch (authErr) {
      // Return manifest data with zero comps if auth fails
      console.error("eBay auth failed:", authErr)
      const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        itemCount: data.itemCount,
        totalMSRP: data.totalMSRP,
        totalCOGS: data.totalCOGS,
        topBrands: Array.from(data.brands.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((e) => e[0]),
        ebayMedianSold: 0,
        ebaySoldCount90d: 0,
        estimatedRecoveryPct: 0,
        confidence: "low" as const,
      }))

      const totalMSRP = categories.reduce((s, c) => s + c.totalMSRP, 0)
      const totalCOGS = categories.reduce((s, c) => s + c.totalCOGS, 0)
      const totalItems = categories.reduce((s, c) => s + c.itemCount, 0)

      return NextResponse.json({
        success: true,
        authError: true,
        categories,
        totals: {
          totalMSRP,
          totalCOGS,
          totalItems,
          weightedRecoveryPct: 0,
          estimatedGrossRevenue: 0,
        },
      })
    }

    // 4. Query eBay for each category (sequential to respect rate limits)
    const categories = []
    let totalWeightedRecovery = 0
    let totalMSRPSum = 0

    for (const [name, data] of categoryMap.entries()) {
      // Build search query from category + top brand
      const topBrand =
        Array.from(data.brands.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || ""
      const searchQuery = topBrand ? `${topBrand} ${name}` : name

      const comps = await searchEbaySold(searchQuery, token)

      const avgMSRPPerUnit = data.itemCount > 0 ? data.totalMSRP / data.itemCount : 0
      const recoveryPct =
        comps.medianPrice > 0 && avgMSRPPerUnit > 0 ? comps.medianPrice / avgMSRPPerUnit : 0

      const confidence: "high" | "medium" | "low" =
        comps.soldCount >= 20 ? "high" : comps.soldCount >= 5 ? "medium" : "low"

      const catResult = {
        name,
        itemCount: data.itemCount,
        totalMSRP: data.totalMSRP,
        totalCOGS: data.totalCOGS,
        topBrands: Array.from(data.brands.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((e) => e[0]),
        ebayMedianSold: comps.medianPrice,
        ebaySoldCount90d: comps.soldCount,
        estimatedRecoveryPct: recoveryPct,
        confidence,
        searchQuery,
      }

      categories.push(catResult)
      totalWeightedRecovery += recoveryPct * data.totalMSRP
      totalMSRPSum += data.totalMSRP

      // Small delay between API calls
      await new Promise((r) => setTimeout(r, 300))
    }

    const weightedRecoveryPct = totalMSRPSum > 0 ? totalWeightedRecovery / totalMSRPSum : 0
    const totalMSRP = categories.reduce((s, c) => s + c.totalMSRP, 0)
    const totalCOGS = categories.reduce((s, c) => s + c.totalCOGS, 0)
    const totalItems = categories.reduce((s, c) => s + c.itemCount, 0)

    // Sort by MSRP descending (most valuable categories first)
    categories.sort((a, b) => b.totalMSRP - a.totalMSRP)

    return NextResponse.json({
      success: true,
      categories,
      totals: {
        totalMSRP,
        totalCOGS,
        totalItems,
        weightedRecoveryPct,
        estimatedGrossRevenue: totalMSRP * weightedRecoveryPct,
      },
    })
  } catch (error) {
    console.error("eBay comps API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        success: false,
      },
      { status: 500 }
    )
  }
}
