import { NextRequest, NextResponse } from "next/server";
import getPool from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestProduct {
  upc: string | null;
  product_name: string;
  category: string | null;
  unit_retail: number;
  line_item_brands: string | null;
  total_qty: number;
  total_msrp: number;
  avg_cogs_per_unit: number;
}

interface EbayCompResult {
  medianSold: number;
  avgSold: number;
  p25: number;
  p75: number;
  soldCount: number;
  prices: number[];
}

interface ProductResult {
  upc: string | null;
  productName: string;
  category: string | null;
  brand: string | null;
  unitRetail: number;
  totalQty: number;
  totalMSRP: number;
  avgCogsPerUnit: number;
  ebayMedianSold: number;
  ebayAvgSold: number;
  ebayP25: number;
  ebayP75: number;
  ebaySoldCount90d: number;
  recoveryPct: number;
  confidence: "high" | "medium" | "low";
  estimatedRevenue: number;
  estimatedProfit: number;
  routable: boolean;
  queried: boolean;
}

interface CategoryAgg {
  category: string;
  productCount: number;
  totalItems: number;
  totalMSRP: number;
  totalCOGS: number;
  weightedRecoveryPct: number;
  estimatedRevenue: number;
  estimatedProfit: number;
}

interface RoutingBucket {
  productCount: number;
  totalItems: number;
  totalMSRP: number;
  totalCOGS: number;
  estimatedRevenue: number;
  estimatedProfit: number;
  avgRecovery: number;
}

// ---------------------------------------------------------------------------
// eBay OAuth – in-memory token cache
// ---------------------------------------------------------------------------

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getEbayToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 300_000) {
    return cachedToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET env vars");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay OAuth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token as string;
  tokenExpiresAt = now + (data.expires_in as number) * 1000;
  return cachedToken;
}

// ---------------------------------------------------------------------------
// eBay search result cache – 4-hour TTL
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

interface CacheEntry {
  result: EbayCompResult;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry>();

function getCached(key: string): EbayCompResult | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: EbayCompResult): void {
  searchCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeStats(prices: number[]): EbayCompResult {
  if (prices.length === 0) {
    return { medianSold: 0, avgSold: 0, p25: 0, p75: 0, soldCount: 0, prices: [] };
  }
  const sorted = [...prices].sort((a, b) => a - b);
  const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  return {
    medianSold: Math.round(median(sorted) * 100) / 100,
    avgSold: Math.round(avg * 100) / 100,
    p25: Math.round(percentile(sorted, 25) * 100) / 100,
    p75: Math.round(percentile(sorted, 75) * 100) / 100,
    soldCount: sorted.length,
    prices: sorted,
  };
}

// ---------------------------------------------------------------------------
// UPC validation
// ---------------------------------------------------------------------------

function isValidUpc(upc: string | null | undefined): upc is string {
  if (!upc) return false;
  const cleaned = upc.replace(/\D/g, "");
  return cleaned.length === 12 || cleaned.length === 13;
}

// ---------------------------------------------------------------------------
// eBay Browse API – search sold items
// ---------------------------------------------------------------------------

const DELAY_MS = 400;
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchEbaySold(
  token: string,
  productName: string,
  upc: string | null
): Promise<EbayCompResult> {
  const cacheKey = `${productName}||${upc ?? ""}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let query = productName;
  if (isValidUpc(upc)) {
    query = `${upc} ${productName}`;
  }

  const params = new URLSearchParams({
    q: query,
    limit: "50",
    sort: "-endDate",
    filter: "buyingOptions:{FIXED_PRICE|AUCTION},conditions:{NEW|LIKE_NEW|VERY_GOOD|GOOD},priceCurrency:USD",
  });

  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      });

      if (res.status === 429) {
        const backoff = Math.pow(2, attempt + 1) * 500;
        await sleep(backoff);
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`eBay search failed (${res.status}): ${text}`);
      }

      const data = await res.json();
      const items: any[] = data.itemSummaries ?? [];

      const prices: number[] = [];
      for (const item of items) {
        const priceVal = parseFloat(item.price?.value);
        if (!isNaN(priceVal) && priceVal > 0) {
          prices.push(priceVal);
        }
      }

      const result = computeStats(prices);
      setCache(cacheKey, result);
      return result;
    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const backoff = Math.pow(2, attempt + 1) * 500;
        await sleep(backoff);
      }
    }
  }

  console.error(
    `eBay search failed for "${productName}" after ${MAX_RETRIES} retries:`,
    lastError?.message
  );
  const empty = computeStats([]);
  setCache(cacheKey, empty);
  return empty;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10));

    // 1. Fetch unique products from Postgres
    const pool = getPool();
    const query = `
      SELECT
        upc,
        product_name,
        category,
        unit_retail,
        line_item_brands,
        SUM(quantity)::int            AS total_qty,
        SUM(total_retail)::numeric    AS total_msrp,
        AVG(allocated_cogs_per_unit)  AS avg_cogs_per_unit
      FROM tl_manifest_items
      GROUP BY upc, product_name, category, unit_retail, line_item_brands
      ORDER BY SUM(total_retail) DESC
    `;

    const { rows } = await pool.query(query);

    const products: ManifestProduct[] = rows.map((r: any) => ({
      upc: r.upc ?? null,
      product_name: r.product_name ?? "",
      category: r.category ?? null,
      unit_retail: parseFloat(r.unit_retail) || 0,
      line_item_brands: r.line_item_brands ?? null,
      total_qty: parseInt(r.total_qty, 10) || 0,
      total_msrp: parseFloat(r.total_msrp) || 0,
      avg_cogs_per_unit: parseFloat(r.avg_cogs_per_unit) || 0,
    }));

    // 2. Obtain eBay token
    const token = await getEbayToken();

    // 3. Query eBay for top `limit` products; remainder gets default 30%
    const querySlice = products.slice(0, limit);
    const defaultSlice = products.slice(limit);

    let queryCount = 0;
    const EBAY_FEE_PCT = 0.13;
    const DEFAULT_RECOVERY = 0.30;

    const queriedResults: ProductResult[] = [];

    for (const p of querySlice) {
      const comp = await searchEbaySold(token, p.product_name, p.upc);
      queryCount++;

      const medianPrice = comp.medianSold;
      const unitRetail = p.unit_retail || 1;
      const recoveryPct =
        medianPrice > 0 && unitRetail > 0
          ? Math.round((medianPrice / unitRetail) * 10000) / 10000
          : 0;

      const confidence: "high" | "medium" | "low" =
        comp.soldCount >= 20 ? "high" : comp.soldCount >= 5 ? "medium" : "low";

      const estimatedRevenue = medianPrice * p.total_qty;
      const ebayFees = estimatedRevenue * EBAY_FEE_PCT;
      const totalCogs = p.avg_cogs_per_unit * p.total_qty;
      const estimatedProfit = estimatedRevenue - ebayFees - totalCogs;

      const routable = recoveryPct >= 0.60 && confidence !== "low";

      queriedResults.push({
        upc: p.upc,
        productName: p.product_name,
        category: p.category,
        brand: p.line_item_brands,
        unitRetail: p.unit_retail,
        totalQty: p.total_qty,
        totalMSRP: p.total_msrp,
        avgCogsPerUnit: p.avg_cogs_per_unit,
        ebayMedianSold: comp.medianSold,
        ebayAvgSold: comp.avgSold,
        ebayP25: comp.p25,
        ebayP75: comp.p75,
        ebaySoldCount90d: comp.soldCount,
        recoveryPct,
        confidence,
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
        estimatedProfit: Math.round(estimatedProfit * 100) / 100,
        routable,
        queried: true,
      });

      if (queryCount < querySlice.length) {
        await sleep(DELAY_MS);
      }
    }

    const defaultResults: ProductResult[] = defaultSlice.map((p) => {
      const estimatedSoldPrice = p.unit_retail * DEFAULT_RECOVERY;
      const estimatedRevenue = estimatedSoldPrice * p.total_qty;
      const ebayFees = estimatedRevenue * EBAY_FEE_PCT;
      const totalCogs = p.avg_cogs_per_unit * p.total_qty;
      const estimatedProfit = estimatedRevenue - ebayFees - totalCogs;

      return {
        upc: p.upc,
        productName: p.product_name,
        category: p.category,
        brand: p.line_item_brands,
        unitRetail: p.unit_retail,
        totalQty: p.total_qty,
        totalMSRP: p.total_msrp,
        avgCogsPerUnit: p.avg_cogs_per_unit,
        ebayMedianSold: Math.round(estimatedSoldPrice * 100) / 100,
        ebayAvgSold: Math.round(estimatedSoldPrice * 100) / 100,
        ebayP25: 0,
        ebayP75: 0,
        ebaySoldCount90d: 0,
        recoveryPct: DEFAULT_RECOVERY,
        confidence: "low" as const,
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
        estimatedProfit: Math.round(estimatedProfit * 100) / 100,
        routable: false,
        queried: false,
      };
    });

    const allProducts = [...queriedResults, ...defaultResults].sort(
      (a, b) => b.estimatedProfit - a.estimatedProfit
    );

    // 4. Category aggregation
    const categoryMap = new Map<string, CategoryAgg>();

    for (const p of allProducts) {
      const cat = p.category ?? "Uncategorized";
      let agg = categoryMap.get(cat);
      if (!agg) {
        agg = {
          category: cat,
          productCount: 0,
          totalItems: 0,
          totalMSRP: 0,
          totalCOGS: 0,
          weightedRecoveryPct: 0,
          estimatedRevenue: 0,
          estimatedProfit: 0,
        };
        categoryMap.set(cat, agg);
      }
      agg.productCount += 1;
      agg.totalItems += p.totalQty;
      agg.totalMSRP += p.totalMSRP;
      agg.totalCOGS += p.avgCogsPerUnit * p.totalQty;
      agg.estimatedRevenue += p.estimatedRevenue;
      agg.estimatedProfit += p.estimatedProfit;
    }

    const categories: CategoryAgg[] = [];
    for (const agg of categoryMap.values()) {
      agg.weightedRecoveryPct =
        agg.totalMSRP > 0
          ? Math.round((agg.estimatedRevenue / agg.totalMSRP) * 10000) / 10000
          : 0;
      agg.totalMSRP = Math.round(agg.totalMSRP * 100) / 100;
      agg.totalCOGS = Math.round(agg.totalCOGS * 100) / 100;
      agg.estimatedRevenue = Math.round(agg.estimatedRevenue * 100) / 100;
      agg.estimatedProfit = Math.round(agg.estimatedProfit * 100) / 100;
      categories.push(agg);
    }
    categories.sort((a, b) => b.estimatedProfit - a.estimatedProfit);

    // 5. Totals
    const totalProducts = allProducts.length;
    const totalItems = allProducts.reduce((s, p) => s + p.totalQty, 0);
    const totalMSRP = allProducts.reduce((s, p) => s + p.totalMSRP, 0);
    const totalCOGS = allProducts.reduce(
      (s, p) => s + p.avgCogsPerUnit * p.totalQty,
      0
    );
    const estimatedGrossRevenue = allProducts.reduce(
      (s, p) => s + p.estimatedRevenue,
      0
    );
    const estimatedNetProfit = allProducts.reduce(
      (s, p) => s + p.estimatedProfit,
      0
    );
    const weightedRecoveryPct =
      totalMSRP > 0 ? estimatedGrossRevenue / totalMSRP : 0;

    const routableProducts = allProducts.filter((p) => p.routable);
    const routableItems = routableProducts.reduce((s, p) => s + p.totalQty, 0);
    const routableMSRP = routableProducts.reduce((s, p) => s + p.totalMSRP, 0);

    // 6. Routing analysis
    const WHOLESALE_RECOVERY = 0.18;

    const mpProducts = routableProducts;
    const mpTotalItems = mpProducts.reduce((s, p) => s + p.totalQty, 0);
    const mpTotalMSRP = mpProducts.reduce((s, p) => s + p.totalMSRP, 0);
    const mpTotalCOGS = mpProducts.reduce(
      (s, p) => s + p.avgCogsPerUnit * p.totalQty,
      0
    );
    const mpRevenue = mpProducts.reduce((s, p) => s + p.estimatedRevenue, 0);
    const mpFees = mpRevenue * EBAY_FEE_PCT;
    const mpProfit = mpRevenue - mpFees - mpTotalCOGS;
    const mpAvgRecovery = mpTotalMSRP > 0 ? mpRevenue / mpTotalMSRP : 0;

    const wsProducts = allProducts.filter((p) => !p.routable);
    const wsTotalItems = wsProducts.reduce((s, p) => s + p.totalQty, 0);
    const wsTotalMSRP = wsProducts.reduce((s, p) => s + p.totalMSRP, 0);
    const wsTotalCOGS = wsProducts.reduce(
      (s, p) => s + p.avgCogsPerUnit * p.totalQty,
      0
    );
    const wsRevenue = wsTotalMSRP * WHOLESALE_RECOVERY;
    const wsProfit = wsRevenue - wsTotalCOGS;

    const combinedRevenue = mpRevenue + wsRevenue;
    const combinedProfit = mpProfit + wsProfit;

    const allWsRevenue = totalMSRP * WHOLESALE_RECOVERY;
    const allWsProfit = allWsRevenue - totalCOGS;

    const marketplace: RoutingBucket = {
      productCount: mpProducts.length,
      totalItems: mpTotalItems,
      totalMSRP: Math.round(mpTotalMSRP * 100) / 100,
      totalCOGS: Math.round(mpTotalCOGS * 100) / 100,
      estimatedRevenue: Math.round(mpRevenue * 100) / 100,
      estimatedProfit: Math.round(mpProfit * 100) / 100,
      avgRecovery: Math.round(mpAvgRecovery * 10000) / 10000,
    };

    const wholesale: RoutingBucket = {
      productCount: wsProducts.length,
      totalItems: wsTotalItems,
      totalMSRP: Math.round(wsTotalMSRP * 100) / 100,
      totalCOGS: Math.round(wsTotalCOGS * 100) / 100,
      estimatedRevenue: Math.round(wsRevenue * 100) / 100,
      estimatedProfit: Math.round(wsProfit * 100) / 100,
      avgRecovery: WHOLESALE_RECOVERY,
    };

    const combined = {
      totalItems,
      totalMSRP: Math.round(totalMSRP * 100) / 100,
      totalCOGS: Math.round(totalCOGS * 100) / 100,
      estimatedRevenue: Math.round(combinedRevenue * 100) / 100,
      estimatedProfit: Math.round(combinedProfit * 100) / 100,
    };

    const allWholesale: RoutingBucket = {
      productCount: totalProducts,
      totalItems,
      totalMSRP: Math.round(totalMSRP * 100) / 100,
      totalCOGS: Math.round(totalCOGS * 100) / 100,
      estimatedRevenue: Math.round(allWsRevenue * 100) / 100,
      estimatedProfit: Math.round(allWsProfit * 100) / 100,
      avgRecovery: WHOLESALE_RECOVERY,
    };

    // 7. Build response
    const processingTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      products: allProducts,
      categories,
      totals: {
        totalProducts,
        totalItems,
        totalMSRP: Math.round(totalMSRP * 100) / 100,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        weightedRecoveryPct: Math.round(weightedRecoveryPct * 10000) / 10000,
        estimatedGrossRevenue: Math.round(estimatedGrossRevenue * 100) / 100,
        estimatedNetProfit: Math.round(estimatedNetProfit * 100) / 100,
        routableItems,
        routableMSRP: Math.round(routableMSRP * 100) / 100,
      },
      routingAnalysis: {
        marketplace,
        wholesale,
        combined,
        allWholesale,
      },
      meta: {
        queryCount,
        uniqueProducts: totalProducts,
        processingTimeMs,
      },
    });
  } catch (err: any) {
    console.error("ebay-comps-upc-route error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message ?? "Internal server error",
      },
      { status: 500 }
    );
  }
}
