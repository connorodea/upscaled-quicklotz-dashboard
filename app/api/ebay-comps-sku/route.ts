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
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }
  return cachedToken.token
}

// --- Comps query cache (4-hour TTL) ---
const compsCache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL = 4 * 60 * 60 * 1000

async function searchEbaySold(
  query: string,
  token: string
): Promise<{ medianPrice: number; avgPrice: number; soldCount: number; prices: number[]; p25: number; p75: number }> {
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

      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
      const p25 = prices.length >= 4 ? prices[Math.floor(prices.length * 0.25)] : prices[0] || 0
      const p75 = prices.length >= 4 ? prices[Math.floor(prices.length * 0.75)] : prices[prices.length - 1] || 0

      const result = { medianPrice, avgPrice, soldCount: prices.length, prices, p25, p75 }
      compsCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL })
      return result
    } catch (e) {
      lastError = e as Error
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }

  console.error(`eBay search failed for "${query}":`, lastError)
  return { medianPrice: 0, avgPrice: 0, soldCount: 0, prices: [], p25: 0, p75: 0 }
}

// Category-to-search-term mapping for better eBay results
const categorySearchTerms: Record<string, string> = {
  "Vacuums & Floorcare": "vacuum",
  "Small Appliances": "kitchen appliance",
  "Ice Makers": "ice maker",
  "Camera Accessories": "camera accessories",
  "Home Theater Audio": "home audio",
  "Home Theater Accessories": "home theater mount",
  "Soundbars": "soundbar",
  "Toys & Games": "toys",
}

// --- Main handler ---
export async function GET() {
  try {
    const pool = getPool()
    const result = await pool.query(`
      SELECT
        li.title_simplified as category,
        li.brands,
        COALESCE(li.msrp, 0) as msrp,
        COALESCE(li.all_in_cost, 0) as all_in_cost,
        COALESCE(li.item_count, 0) as item_count,
        li.upd_bby_id
      FROM tl_orders o
      JOIN tl_line_items li ON o.order_id = li.order_id
      ORDER BY o.order_date DESC
    `)

    // Build per-brand-category SKUs
    // Each line item has brands like "iRobot, Shark, BISSELL"
    // We split and allocate items proportionally (equal split among listed brands)
    interface BrandSKU {
      brand: string
      category: string
      searchQuery: string
      allocatedItems: number
      allocatedMSRP: number
      allocatedCOGS: number
      avgUnitMSRP: number
      sourceLineItems: string[] // upd_bby_ids
    }

    const skuMap = new Map<string, BrandSKU>()

    for (const row of result.rows) {
      const category = row.category || "General Merchandise"
      const brands = row.brands
        ? row.brands.split(",").map((b: string) => b.trim()).filter((b: string) => b.length > 0)
        : ["Unknown"]
      const itemCount = parseInt(row.item_count) || 1
      const msrp = parseFloat(row.msrp) || 0
      const cogs = parseFloat(row.all_in_cost) || 0

      // Allocate items equally across brands in the lot
      const brandCount = brands.length
      const itemsPerBrand = itemCount / brandCount
      const msrpPerBrand = msrp / brandCount
      const cogsPerBrand = cogs / brandCount

      for (const brand of brands) {
        const key = `${brand}|||${category}`
        const existing = skuMap.get(key)
        if (existing) {
          existing.allocatedItems += itemsPerBrand
          existing.allocatedMSRP += msrpPerBrand
          existing.allocatedCOGS += cogsPerBrand
          existing.sourceLineItems.push(row.upd_bby_id || "")
        } else {
          const searchTerm = categorySearchTerms[category] || category.toLowerCase()
          skuMap.set(key, {
            brand,
            category,
            searchQuery: `${brand} ${searchTerm}`,
            allocatedItems: itemsPerBrand,
            allocatedMSRP: msrpPerBrand,
            allocatedCOGS: cogsPerBrand,
            avgUnitMSRP: 0, // computed after aggregation
            sourceLineItems: [row.upd_bby_id || ""],
          })
        }
      }
    }

    // Compute avg unit MSRP for each SKU
    for (const sku of skuMap.values()) {
      sku.avgUnitMSRP = sku.allocatedItems > 0 ? sku.allocatedMSRP / sku.allocatedItems : 0
    }

    // Get eBay token
    let token: string
    try {
      token = await getEbayToken()
    } catch (authErr) {
      console.error("eBay auth failed:", authErr)
      const skus = Array.from(skuMap.values()).map((sku) => ({
        brand: sku.brand,
        category: sku.category,
        searchQuery: sku.searchQuery,
        allocatedItems: Math.round(sku.allocatedItems),
        allocatedMSRP: Math.round(sku.allocatedMSRP * 100) / 100,
        allocatedCOGS: Math.round(sku.allocatedCOGS * 100) / 100,
        avgUnitMSRP: Math.round(sku.avgUnitMSRP * 100) / 100,
        ebayMedianSold: 0,
        ebayAvgSold: 0,
        ebayP25: 0,
        ebayP75: 0,
        ebaySoldCount90d: 0,
        recoveryPct: 0,
        confidence: "low" as const,
        estimatedRevenue: 0,
        estimatedProfit: 0,
        routable: false,
      }))

      return NextResponse.json({
        success: true,
        authError: true,
        skus,
        categories: aggregateByCategory(skus),
        totals: computeTotals(skus),
      })
    }

    // Query eBay for each unique brand+category combo
    const skus = []
    let queryCount = 0

    for (const sku of skuMap.values()) {
      const comps = await searchEbaySold(sku.searchQuery, token)
      queryCount++

      const recoveryPct =
        comps.medianPrice > 0 && sku.avgUnitMSRP > 0
          ? comps.medianPrice / sku.avgUnitMSRP
          : 0

      const confidence: "high" | "medium" | "low" =
        comps.soldCount >= 20 ? "high" : comps.soldCount >= 5 ? "medium" : "low"

      const estimatedRevenue = comps.medianPrice * sku.allocatedItems
      const ebayFee = estimatedRevenue * 0.13 // 13% eBay fees
      const estimatedProfit = estimatedRevenue - ebayFee - sku.allocatedCOGS

      const skuResult = {
        brand: sku.brand,
        category: sku.category,
        searchQuery: sku.searchQuery,
        allocatedItems: Math.round(sku.allocatedItems),
        allocatedMSRP: Math.round(sku.allocatedMSRP * 100) / 100,
        allocatedCOGS: Math.round(sku.allocatedCOGS * 100) / 100,
        avgUnitMSRP: Math.round(sku.avgUnitMSRP * 100) / 100,
        ebayMedianSold: Math.round(comps.medianPrice * 100) / 100,
        ebayAvgSold: Math.round(comps.avgPrice * 100) / 100,
        ebayP25: Math.round(comps.p25 * 100) / 100,
        ebayP75: Math.round(comps.p75 * 100) / 100,
        ebaySoldCount90d: comps.soldCount,
        recoveryPct: Math.round(recoveryPct * 10000) / 10000,
        confidence,
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
        estimatedProfit: Math.round(estimatedProfit * 100) / 100,
        routable: recoveryPct >= 0.6 && confidence !== "low",
      }

      skus.push(skuResult)

      // Delay between API calls to respect rate limits
      await new Promise((r) => setTimeout(r, 350))
    }

    // Sort by estimated profit descending
    skus.sort((a, b) => b.estimatedProfit - a.estimatedProfit)

    const categories = aggregateByCategory(skus)
    const totals = computeTotals(skus)

    // Routing analysis: what if we only sell routable SKUs on marketplace?
    const routableSkus = skus.filter((s) => s.routable)
    const wholesaleSkus = skus.filter((s) => !s.routable)

    const routingAnalysis = {
      marketplace: {
        skuCount: routableSkus.length,
        totalItems: routableSkus.reduce((s, sk) => s + sk.allocatedItems, 0),
        totalMSRP: routableSkus.reduce((s, sk) => s + sk.allocatedMSRP, 0),
        totalCOGS: routableSkus.reduce((s, sk) => s + sk.allocatedCOGS, 0),
        estimatedRevenue: routableSkus.reduce((s, sk) => s + sk.estimatedRevenue, 0),
        estimatedProfit: routableSkus.reduce((s, sk) => s + sk.estimatedProfit, 0),
        avgRecovery:
          routableSkus.length > 0
            ? routableSkus.reduce((s, sk) => s + sk.recoveryPct * sk.allocatedMSRP, 0) /
              routableSkus.reduce((s, sk) => s + sk.allocatedMSRP, 0)
            : 0,
      },
      wholesale: {
        skuCount: wholesaleSkus.length,
        totalItems: wholesaleSkus.reduce((s, sk) => s + sk.allocatedItems, 0),
        totalMSRP: wholesaleSkus.reduce((s, sk) => s + sk.allocatedMSRP, 0),
        totalCOGS: wholesaleSkus.reduce((s, sk) => s + sk.allocatedCOGS, 0),
        // Wholesale at 18% of MSRP
        estimatedRevenue: wholesaleSkus.reduce((s, sk) => s + sk.allocatedMSRP, 0) * 0.18,
        estimatedProfit:
          wholesaleSkus.reduce((s, sk) => s + sk.allocatedMSRP, 0) * 0.18 -
          wholesaleSkus.reduce((s, sk) => s + sk.allocatedCOGS, 0),
      },
      combined: {
        totalItems: skus.reduce((s, sk) => s + sk.allocatedItems, 0),
        totalMSRP: skus.reduce((s, sk) => s + sk.allocatedMSRP, 0),
        totalCOGS: skus.reduce((s, sk) => s + sk.allocatedCOGS, 0),
        estimatedRevenue: 0,
        estimatedProfit: 0,
      },
      allWholesale: {
        totalItems: skus.reduce((s, sk) => s + sk.allocatedItems, 0),
        totalMSRP: skus.reduce((s, sk) => s + sk.allocatedMSRP, 0),
        totalCOGS: skus.reduce((s, sk) => s + sk.allocatedCOGS, 0),
        estimatedRevenue: skus.reduce((s, sk) => s + sk.allocatedMSRP, 0) * 0.18,
        estimatedProfit:
          skus.reduce((s, sk) => s + sk.allocatedMSRP, 0) * 0.18 -
          skus.reduce((s, sk) => s + sk.allocatedCOGS, 0),
      },
    }

    // Combined hybrid
    routingAnalysis.combined.estimatedRevenue =
      routingAnalysis.marketplace.estimatedRevenue + routingAnalysis.wholesale.estimatedRevenue
    routingAnalysis.combined.estimatedProfit =
      routingAnalysis.marketplace.estimatedProfit + routingAnalysis.wholesale.estimatedProfit

    return NextResponse.json({
      success: true,
      skus,
      categories,
      totals,
      routingAnalysis,
      meta: {
        queryCount,
        uniqueBrandCategories: skuMap.size,
        cacheHits: queryCount - skuMap.size + compsCache.size,
      },
    })
  } catch (error) {
    console.error("eBay comps SKU API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        success: false,
      },
      { status: 500 }
    )
  }
}

// Helper: aggregate SKUs back into category summaries
function aggregateByCategory(skus: any[]) {
  const catMap = new Map<string, any>()
  for (const sku of skus) {
    const cat = catMap.get(sku.category) || {
      name: sku.category,
      itemCount: 0,
      totalMSRP: 0,
      totalCOGS: 0,
      brands: [] as { brand: string; items: number; recoveryPct: number; confidence: string; ebayMedian: number }[],
      estimatedRevenue: 0,
      estimatedProfit: 0,
    }
    cat.itemCount += sku.allocatedItems
    cat.totalMSRP += sku.allocatedMSRP
    cat.totalCOGS += sku.allocatedCOGS
    cat.estimatedRevenue += sku.estimatedRevenue
    cat.estimatedProfit += sku.estimatedProfit
    cat.brands.push({
      brand: sku.brand,
      items: sku.allocatedItems,
      recoveryPct: sku.recoveryPct,
      confidence: sku.confidence,
      ebayMedian: sku.ebayMedianSold,
    })
    catMap.set(sku.category, cat)
  }

  const categories = Array.from(catMap.values()).map((cat) => ({
    ...cat,
    weightedRecovery:
      cat.totalMSRP > 0
        ? cat.brands.reduce(
            (s: number, b: any) => s + b.recoveryPct * (b.items * (cat.totalMSRP / cat.itemCount)),
            0
          ) / cat.totalMSRP
        : 0,
  }))

  categories.sort((a, b) => b.totalMSRP - a.totalMSRP)
  return categories
}

// Helper: compute overall totals
function computeTotals(skus: any[]) {
  const totalMSRP = skus.reduce((s, sk) => s + sk.allocatedMSRP, 0)
  const totalCOGS = skus.reduce((s, sk) => s + sk.allocatedCOGS, 0)
  const totalItems = skus.reduce((s, sk) => s + sk.allocatedItems, 0)
  const totalRevenue = skus.reduce((s, sk) => s + sk.estimatedRevenue, 0)
  const totalProfit = skus.reduce((s, sk) => s + sk.estimatedProfit, 0)

  const weightedRecoveryPct =
    totalMSRP > 0
      ? skus.reduce((s, sk) => s + sk.recoveryPct * sk.allocatedMSRP, 0) / totalMSRP
      : 0

  return {
    totalMSRP: Math.round(totalMSRP * 100) / 100,
    totalCOGS: Math.round(totalCOGS * 100) / 100,
    totalItems: Math.round(totalItems),
    weightedRecoveryPct: Math.round(weightedRecoveryPct * 10000) / 10000,
    estimatedGrossRevenue: Math.round(totalRevenue * 100) / 100,
    estimatedNetProfit: Math.round(totalProfit * 100) / 100,
    routableItems: skus.filter((s) => s.routable).reduce((s, sk) => s + sk.allocatedItems, 0),
    routableMSRP: skus.filter((s) => s.routable).reduce((s, sk) => s + sk.allocatedMSRP, 0),
  }
}
