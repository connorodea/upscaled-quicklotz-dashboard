"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/kpi-card"
import { DataTable, type Column } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, DollarSign, Percent, Loader2, Database, ArrowUpRight, ArrowDownRight, Package, Barcode } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  ReferenceArea,
  Cell,
} from "recharts"

interface Order {
  id: string
  date: string
  orderId: string
  status: string
  shipTo: string
  totalAllIn: number
  totalMSRP: number
  percentOfMSRP: number
  totalItems: number
  totalPallets: number
}

interface Settings {
  auctionRecoveryRate: number
  wholesaleRecoveryRate: number
  defaultWeeklyMSRP: number
}

// Per-SKU types for the new API
interface SKUComps {
  brand: string
  category: string
  searchQuery: string
  allocatedItems: number
  allocatedMSRP: number
  allocatedCOGS: number
  avgUnitMSRP: number
  ebayMedianSold: number
  ebayAvgSold: number
  ebayP25: number
  ebayP75: number
  ebaySoldCount90d: number
  recoveryPct: number
  confidence: "high" | "medium" | "low"
  estimatedRevenue: number
  estimatedProfit: number
  routable: boolean
}

interface CategoryAgg {
  name: string
  itemCount: number
  totalMSRP: number
  totalCOGS: number
  estimatedRevenue: number
  estimatedProfit: number
  weightedRecovery: number
  brands: { brand: string; items: number; recoveryPct: number; confidence: string; ebayMedian: number }[]
}

interface RoutingAnalysis {
  marketplace: { skuCount: number; totalItems: number; totalMSRP: number; totalCOGS: number; estimatedRevenue: number; estimatedProfit: number; avgRecovery: number }
  wholesale: { skuCount: number; totalItems: number; totalMSRP: number; totalCOGS: number; estimatedRevenue: number; estimatedProfit: number }
  combined: { totalItems: number; totalMSRP: number; totalCOGS: number; estimatedRevenue: number; estimatedProfit: number }
  allWholesale: { totalItems: number; totalMSRP: number; totalCOGS: number; estimatedRevenue: number; estimatedProfit: number }
}

interface SKUCompsResponse {
  success: boolean
  authError?: boolean
  skus: SKUComps[]
  categories: CategoryAgg[]
  totals: {
    totalMSRP: number
    totalCOGS: number
    totalItems: number
    weightedRecoveryPct: number
    estimatedGrossRevenue: number
    estimatedNetProfit: number
    routableItems: number
    routableMSRP: number
  }
  routingAnalysis?: RoutingAnalysis
  meta?: { queryCount: number; uniqueBrandCategories: number }
}

const CHANNELS = [
  { name: "eBay", fee: 0.13, color: "oklch(0.72 0.15 185)" },
  { name: "Amazon", fee: 0.15, color: "oklch(0.70 0.18 160)" },
  { name: "Back Market", fee: 0.12, color: "oklch(0.75 0.16 85)" },
  { name: "Own Website", fee: 0.03, color: "oklch(0.65 0.20 30)" },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatCurrency2 = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

export function MarketplaceProjectionsContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [, setSettings] = useState<Settings | null>(null)
  const [weeklyMSRP, setWeeklyMSRP] = useState(500000)
  const [minRecoveryRate, setMinRecoveryRate] = useState(30)
  const [maxRecoveryRate, setMaxRecoveryRate] = useState(70)
  const [rateStep, setRateStep] = useState(5)
  const [opsFeeRate, setOpsFeeRate] = useState(30)
  const [shippingPerUnit, setShippingPerUnit] = useState(10)
  const [unitsPerLot, setUnitsPerLot] = useState(50)

  // Manifest toggle state — supports both per-SKU and per-UPC APIs
  const [useManifest, setUseManifest] = useState(false)
  const [compsLevel, setCompsLevel] = useState<"sku" | "upc">("upc")
  const [skuData, setSkuData] = useState<SKUCompsResponse | null>(null)
  const [compsLoading, setCompsLoading] = useState(false)
  const [compsError, setCompsError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings)
          setWeeklyMSRP(data.settings.defaultWeeklyMSRP || 500000)
        }
      })
      .catch((err) => console.error("Failed to load settings:", err))

    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.orders) {
          setOrders(data.orders)
          const totalItems = data.orders.reduce((s: number, o: Order) => s + o.totalItems, 0)
          const totalOrders = data.orders.length
          if (totalOrders > 0 && totalItems > 0) {
            setUnitsPerLot(Math.round(totalItems / totalOrders))
          }
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch orders:", err)
        setLoading(false)
      })
  }, [])

  // Fetch eBay comps when manifest toggle is enabled
  useEffect(() => {
    if (useManifest && !skuData && !compsLoading) {
      setCompsLoading(true)
      setCompsError(null)
      const endpoint = compsLevel === "upc" ? "/api/ebay-comps-upc?limit=150" : "/api/ebay-comps-sku"
      fetch(endpoint)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Normalize per-UPC response to match SKUCompsResponse shape
            if (compsLevel === "upc" && data.products) {
              const normalized: SKUCompsResponse = {
                success: true,
                skus: data.products.map((p: any) => ({
                  brand: p.brand || "Unknown",
                  category: p.category || "Uncategorized",
                  searchQuery: p.productName,
                  allocatedItems: p.totalQty,
                  allocatedMSRP: p.totalMSRP,
                  allocatedCOGS: p.avgCogsPerUnit * p.totalQty,
                  avgUnitMSRP: p.unitRetail,
                  ebayMedianSold: p.ebayMedianSold,
                  ebayAvgSold: p.ebayAvgSold,
                  ebayP25: p.ebayP25,
                  ebayP75: p.ebayP75,
                  ebaySoldCount90d: p.ebaySoldCount90d,
                  recoveryPct: p.recoveryPct,
                  confidence: p.confidence,
                  estimatedRevenue: p.estimatedRevenue,
                  estimatedProfit: p.estimatedProfit,
                  routable: p.routable,
                  // Extra UPC fields
                  upc: p.upc,
                  productName: p.productName,
                  queried: p.queried,
                })),
                categories: data.categories.map((c: any) => ({
                  name: c.category,
                  itemCount: c.totalItems,
                  totalMSRP: c.totalMSRP,
                  totalCOGS: c.totalCOGS,
                  estimatedRevenue: c.estimatedRevenue,
                  estimatedProfit: c.estimatedProfit,
                  weightedRecovery: c.weightedRecoveryPct,
                  brands: [],
                })),
                totals: {
                  totalMSRP: data.totals.totalMSRP,
                  totalCOGS: data.totals.totalCOGS,
                  totalItems: data.totals.totalItems,
                  weightedRecoveryPct: data.totals.weightedRecoveryPct,
                  estimatedGrossRevenue: data.totals.estimatedGrossRevenue,
                  estimatedNetProfit: data.totals.estimatedNetProfit,
                  routableItems: data.totals.routableItems,
                  routableMSRP: data.totals.routableMSRP,
                },
                routingAnalysis: data.routingAnalysis ? {
                  marketplace: { ...data.routingAnalysis.marketplace, skuCount: data.routingAnalysis.marketplace.productCount },
                  wholesale: { ...data.routingAnalysis.wholesale, skuCount: data.routingAnalysis.wholesale.productCount },
                  combined: data.routingAnalysis.combined,
                  allWholesale: data.routingAnalysis.allWholesale,
                } : undefined,
                meta: { queryCount: data.meta?.queryCount || 0, uniqueBrandCategories: data.meta?.uniqueProducts || 0 },
              }
              setSkuData(normalized)
            } else {
              setSkuData(data)
              if (data.authError) {
                setCompsError("eBay API auth failed. Showing manifest data without comps.")
              }
            }
          } else {
            setCompsError(data.error || "Failed to fetch comps")
          }
          setCompsLoading(false)
        })
        .catch((err) => {
          console.error("Failed to fetch comps:", err)
          setCompsError("Failed to connect to comps API")
          setCompsLoading(false)
        })
    }
  }, [useManifest, skuData, compsLoading, compsLevel])

  // Reset data when comps level changes
  useEffect(() => {
    setSkuData(null)
    setCompsError(null)
  }, [compsLevel])

  // Base data from orders
  const totalMSRP = orders.reduce((sum, order) => sum + order.totalMSRP, 0)
  const totalCOGS = orders.reduce((sum, order) => sum + order.totalAllIn, 0)
  const avgCogsPercent = totalMSRP > 0 ? totalCOGS / totalMSRP : 0.048

  // When manifest mode is on, use actual manifest totals
  const effectiveMSRP = useManifest && skuData ? skuData.totals.totalMSRP : weeklyMSRP * 4
  const effectiveCOGS = useManifest && skuData ? skuData.totals.totalCOGS : (weeklyMSRP * 4) * avgCogsPercent
  const effectiveCogsPercent = effectiveMSRP > 0 ? effectiveCOGS / effectiveMSRP : avgCogsPercent

  const monthlyMSRP = effectiveMSRP
  const estimatedCOGS = effectiveCOGS
  const opsRate = opsFeeRate / 100

  const totalOrderMSRP = totalMSRP || 1
  const unitsPerMSRPDollar = orders.length > 0 ? orders.reduce((s, o) => s + o.totalItems, 0) / totalOrderMSRP : 0
  const estimatedMonthlyUnits = useManifest && skuData
    ? skuData.totals.totalItems
    : Math.round(monthlyMSRP * unitsPerMSRPDollar) || Math.round((monthlyMSRP / 500000) * unitsPerLot * 10)
  const totalShippingCost = estimatedMonthlyUnits * shippingPerUnit

  // eBay comps-derived recovery rate
  const ebayRecoveryPct = skuData?.totals?.weightedRecoveryPct || 0

  const generateRecoveryRates = () => {
    const rates: number[] = []
    const min = Math.max(1, minRecoveryRate)
    const max = Math.min(100, maxRecoveryRate)
    const step = Math.max(1, rateStep)
    for (let i = min; i <= max; i += step) {
      rates.push(i / 100)
    }
    return rates
  }

  const recoveryRates = generateRecoveryRates()

  const channelProfit = (rate: number, channelFee: number) => {
    const gross = monthlyMSRP * rate
    const mktFee = gross * channelFee
    const ops = gross * opsRate
    return gross - mktFee - ops - totalShippingCost - estimatedCOGS
  }

  const breakEvenRate = (channelFee: number) => {
    const denom = monthlyMSRP * (1 - channelFee - opsRate)
    return denom > 0 ? (totalShippingCost + estimatedCOGS) / denom : 1
  }

  const economicData = useMemo(() => {
    const data = []
    for (let i = 0; i <= 80; i++) {
      const rate = i / 100
      const gross = monthlyMSRP * rate
      const entry: Record<string, number | string> = {
        rate: i,
        rateLabel: `${i}%`,
        grossRevenue: gross,
        cogs: estimatedCOGS,
      }
      for (const ch of CHANNELS) {
        const mktFee = gross * ch.fee
        const ops = gross * opsRate
        const profit = gross - mktFee - ops - totalShippingCost - estimatedCOGS
        entry[`profit_${ch.name}`] = profit
      }
      data.push(entry)
    }
    return data
  }, [monthlyMSRP, estimatedCOGS, opsRate, totalShippingCost])

  const curveData = useMemo(() => {
    return recoveryRates.map((rate) => {
      const gross = monthlyMSRP * rate
      const entry: Record<string, number | string> = {
        rate: `${(rate * 100).toFixed(0)}%`,
        rateNum: rate * 100,
        grossRevenue: gross,
      }
      for (const ch of CHANNELS) {
        const profit = channelProfit(rate, ch.fee)
        const roi = estimatedCOGS > 0 ? (profit / estimatedCOGS) * 100 : 0
        entry[`profit_${ch.name}`] = profit
        entry[`roi_${ch.name}`] = roi
      }
      return entry
    })
  }, [recoveryRates, monthlyMSRP, estimatedCOGS, opsRate, totalShippingCost])

  const targetRate = useManifest && ebayRecoveryPct > 0
    ? ebayRecoveryPct
    : recoveryRates.length > 0
      ? recoveryRates[Math.floor(recoveryRates.length / 2)]
      : 0.5

  const channelComparison = CHANNELS.map((ch) => {
    const gross = monthlyMSRP * targetRate
    const mktFee = gross * ch.fee
    const ops = gross * opsRate
    const netProfit = gross - mktFee - ops - totalShippingCost - estimatedCOGS
    return {
      channel: ch.name,
      feePercent: `${(ch.fee * 100).toFixed(0)}%`,
      feeRate: ch.fee,
      grossRevenue: gross,
      marketplaceFees: mktFee,
      opsFees: ops,
      shippingCost: totalShippingCost,
      cogs: estimatedCOGS,
      netProfit,
      samShare: netProfit / 2,
      connorShare: netProfit / 2,
      roi: estimatedCOGS > 0 ? netProfit / estimatedCOGS : 0,
    }
  })

  interface ScenarioRow {
    scenario: string
    recoveryRate: number
    grossRevenue: number
    [key: string]: string | number
  }
  const scenarioTableData: ScenarioRow[] = recoveryRates.map((rate) => {
    const gross = monthlyMSRP * rate
    const row: ScenarioRow = {
      scenario: `${(rate * 100).toFixed(0)}% of MSRP`,
      recoveryRate: rate,
      grossRevenue: gross,
    }
    for (const ch of CHANNELS) {
      const profit = channelProfit(rate, ch.fee)
      row[`profit_${ch.name}`] = profit
      row[`share_${ch.name}`] = profit / 2
      row[`roi_${ch.name}`] = estimatedCOGS > 0 ? profit / estimatedCOGS : 0
    }
    return row
  })

  const waterfallData = CHANNELS.map((ch) => {
    const gross = monthlyMSRP * targetRate
    const mktFee = gross * ch.fee
    const ops = gross * opsRate
    const netProfit = gross - mktFee - ops - totalShippingCost - estimatedCOGS
    return {
      channel: ch.name,
      color: ch.color,
      grossRevenue: gross,
      marketplaceFee: -mktFee,
      opsFee: -ops,
      shippingCost: -totalShippingCost,
      cogs: -estimatedCOGS,
      netProfit,
    }
  })

  // Per-SKU routing chart data
  const routingChartData = useMemo(() => {
    if (!skuData?.routingAnalysis) return null
    const ra = skuData.routingAnalysis
    return [
      {
        strategy: "All Wholesale",
        revenue: ra.allWholesale.estimatedRevenue,
        profit: ra.allWholesale.estimatedProfit,
        profitPerShare: ra.allWholesale.estimatedProfit / 2,
      },
      {
        strategy: "Hybrid (60%+ → Mkt)",
        revenue: ra.combined.estimatedRevenue,
        profit: ra.combined.estimatedProfit,
        profitPerShare: ra.combined.estimatedProfit / 2,
      },
      {
        strategy: "All Marketplace",
        revenue: skuData.totals.estimatedGrossRevenue,
        profit: skuData.totals.estimatedNetProfit,
        profitPerShare: skuData.totals.estimatedNetProfit / 2,
      },
    ]
  }, [skuData])

  // Tooltips
  const EconomicTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0]?.payload
    if (!data) return null
    return (
      <div style={{ backgroundColor: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.25 0.02 260)", borderRadius: "8px", padding: "12px 16px", color: "oklch(0.95 0.01 260)", minWidth: "260px" }}>
        <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Recovery Rate: {Math.round(data.rate)}%</p>
        <p style={{ fontSize: 13, color: "oklch(0.65 0.01 260)", marginBottom: 8 }}>
          Gross Revenue: <span style={{ float: "right", fontFamily: "monospace" }}>{formatCurrency(data.grossRevenue)}</span>
        </p>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          {CHANNELS.map((ch) => {
            const profit = data[`profit_${ch.name}`] as number
            return (
              <p key={ch.name} style={{ color: ch.color }}>
                {ch.name}: <span style={{ float: "right", fontFamily: "monospace", fontWeight: 600 }}>{formatCurrency(profit)}</span>
              </p>
            )
          })}
        </div>
      </div>
    )
  }

  const ChannelTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0]?.payload
    if (!data) return null
    return (
      <div style={{ backgroundColor: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.25 0.02 260)", borderRadius: "8px", padding: "12px 16px", color: "oklch(0.95 0.01 260)", minWidth: "220px" }}>
        <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>{data.rate || data.channel}</p>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          {CHANNELS.map((ch) => {
            const val = data[`profit_${ch.name}`] as number | undefined
            if (val === undefined) return null
            return (
              <p key={ch.name} style={{ color: ch.color }}>
                {ch.name}: <span style={{ float: "right", fontFamily: "monospace", fontWeight: 600 }}>{formatCurrency(val)}</span>
              </p>
            )
          })}
        </div>
      </div>
    )
  }

  const ROITooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0]?.payload
    if (!data) return null
    return (
      <div style={{ backgroundColor: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.25 0.02 260)", borderRadius: "8px", padding: "12px 16px", color: "oklch(0.95 0.01 260)", minWidth: "220px" }}>
        <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Recovery Rate: {data.rate}</p>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          {CHANNELS.map((ch) => {
            const val = data[`roi_${ch.name}`] as number | undefined
            if (val === undefined) return null
            return (
              <p key={ch.name} style={{ color: ch.color }}>
                {ch.name}: <span style={{ float: "right", fontFamily: "monospace", fontWeight: 600 }}>{val.toFixed(1)}%</span>
              </p>
            )
          })}
        </div>
      </div>
    )
  }

  // Table columns
  const scenarioColumns: Column<ScenarioRow>[] = [
    { key: "scenario", header: "Scenario", className: "font-medium" },
    { key: "grossRevenue", header: "Gross Revenue", render: (value) => formatCurrency(value as number), className: "font-mono text-right" },
    ...CHANNELS.map((ch) => ({
      key: `profit_${ch.name}`,
      header: `${ch.name} Profit`,
      render: (value: unknown) => {
        const v = value as number
        return <span className={v >= 0 ? "text-primary" : "text-destructive"}>{formatCurrency(v)}</span>
      },
      className: "font-mono text-right",
    })),
  ]

  interface ChannelRow {
    channel: string
    feePercent: string
    feeRate: number
    grossRevenue: number
    marketplaceFees: number
    opsFees: number
    shippingCost: number
    cogs: number
    netProfit: number
    samShare: number
    connorShare: number
    roi: number
  }
  const channelColumns: Column<ChannelRow>[] = [
    { key: "channel", header: "Channel", className: "font-medium" },
    { key: "feePercent", header: "Fee %", className: "font-mono text-right" },
    { key: "marketplaceFees", header: "Marketplace Fees", render: (value) => formatCurrency(value as number), className: "font-mono text-right text-muted-foreground" },
    { key: "opsFees", header: `Ops (${opsFeeRate}%)`, render: (value) => formatCurrency(value as number), className: "font-mono text-right text-muted-foreground" },
    { key: "shippingCost", header: "Shipping", render: (value) => formatCurrency(value as number), className: "font-mono text-right text-muted-foreground" },
    { key: "netProfit", header: "Net Profit", render: (value) => { const v = value as number; return <span className={v >= 0 ? "text-primary" : "text-destructive"}>{formatCurrency(v)}</span> }, className: "font-mono text-right" },
    { key: "samShare", header: "Sam (50%)", render: (value) => formatCurrency(value as number), className: "font-mono text-right" },
    { key: "connorShare", header: "Connor (50%)", render: (value) => formatCurrency(value as number), className: "font-mono text-right" },
    { key: "roi", header: "ROI", render: (value) => { const v = value as number; return <span className={v >= 0 ? "text-primary" : "text-destructive"}>{formatPercent(v)}</span> }, className: "font-mono text-right" },
  ]

  // Per-SKU/UPC breakdown columns — dynamically add UPC columns
  const skuColumns: Column<SKUComps>[] = [
    ...(compsLevel === "upc" ? [
      { key: "productName" as keyof SKUComps, header: "Product", render: (value: unknown) => {
        const v = value as string
        return <span className="max-w-[200px] truncate block text-xs" title={v}>{v || "—"}</span>
      }, className: "font-medium" },
      { key: "upc" as keyof SKUComps, header: "UPC", render: (value: unknown) => {
        const v = value as string
        return <span className="font-mono text-primary text-xs">{v || "—"}</span>
      }, className: "text-xs" },
    ] : [
      { key: "brand" as keyof SKUComps, header: "Brand", className: "font-medium" },
    ]),
    { key: "category", header: "Category", className: "text-muted-foreground text-sm" },
    { key: "allocatedItems", header: "Items", render: (value: unknown) => Math.round(value as number).toLocaleString(), className: "font-mono text-right" },
    { key: "avgUnitMSRP", header: "Avg MSRP/Unit", render: (value) => formatCurrency2(value as number), className: "font-mono text-right" },
    { key: "allocatedMSRP", header: "Total MSRP", render: (value) => formatCurrency(value as number), className: "font-mono text-right" },
    {
      key: "ebayMedianSold",
      header: "eBay Median",
      render: (value) => {
        const v = value as number
        return v > 0 ? formatCurrency2(v) : <span className="text-muted-foreground">—</span>
      },
      className: "font-mono text-right",
    },
    {
      key: "ebayP25",
      header: "P25–P75",
      render: (_value, row) => {
        const r = row as unknown as SKUComps
        return r.ebayP25 > 0 ? (
          <span className="text-xs text-muted-foreground">{formatCurrency2(r.ebayP25)} – {formatCurrency2(r.ebayP75)}</span>
        ) : <span className="text-muted-foreground">—</span>
      },
      className: "font-mono text-right",
    },
    { key: "ebaySoldCount90d", header: "Sold 90d", render: (value) => (value as number).toLocaleString(), className: "font-mono text-right" },
    {
      key: "recoveryPct",
      header: "Recovery %",
      render: (value) => {
        const v = value as number
        return v > 0 ? (
          <span className={v >= 0.6 ? "text-success font-bold" : v >= 0.3 ? "text-primary font-semibold" : "text-muted-foreground"}>
            {formatPercent(v)}
          </span>
        ) : <span className="text-muted-foreground">—</span>
      },
      className: "font-mono text-right",
    },
    {
      key: "confidence",
      header: "Conf.",
      render: (value) => {
        const c = value as string
        const variant = c === "high" ? "default" : c === "medium" ? "secondary" : "outline"
        return <Badge variant={variant}>{c}</Badge>
      },
      className: "text-center",
    },
    {
      key: "estimatedProfit",
      header: "Est. Profit",
      render: (value) => {
        const v = value as number
        return <span className={v >= 0 ? "text-primary" : "text-destructive"}>{formatCurrency(v)}</span>
      },
      className: "font-mono text-right",
    },
    {
      key: "routable",
      header: "Route",
      render: (value) => {
        const r = value as boolean
        return r ? (
          <Badge variant="default" className="bg-success/20 text-success border-success/30">Marketplace</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">Wholesale</Badge>
        )
      },
      className: "text-center",
    },
  ]

  // Category-level aggregated columns
  const categoryColumns: Column<CategoryAgg>[] = [
    { key: "name", header: "Category", className: "font-medium" },
    { key: "itemCount", header: "Items", render: (value) => Math.round(value as number).toLocaleString(), className: "font-mono text-right" },
    { key: "totalMSRP", header: "Total MSRP", render: (value) => formatCurrency(value as number), className: "font-mono text-right" },
    { key: "totalCOGS", header: "Total COGS", render: (value) => formatCurrency(value as number), className: "font-mono text-right text-muted-foreground" },
    {
      key: "weightedRecovery",
      header: "Wtd Recovery %",
      render: (value) => {
        const v = value as number
        return <span className={v >= 0.6 ? "text-success font-bold" : v >= 0.3 ? "text-primary font-semibold" : "text-muted-foreground"}>{formatPercent(v)}</span>
      },
      className: "font-mono text-right",
    },
    { key: "estimatedRevenue", header: "Est. Revenue", render: (value) => formatCurrency(value as number), className: "font-mono text-right" },
    {
      key: "estimatedProfit",
      header: "Est. Profit",
      render: (value) => {
        const v = value as number
        return <span className={v >= 0 ? "text-primary" : "text-destructive"}>{formatCurrency(v)}</span>
      },
      className: "font-mono text-right",
    },
    {
      key: "brands",
      header: "Brand Breakdown",
      render: (value) => {
        const brands = value as CategoryAgg["brands"]
        return (
          <div className="flex flex-wrap gap-1">
            {brands.slice(0, 5).map((b) => (
              <span key={b.brand} className="inline-flex items-center gap-1 text-xs rounded bg-muted px-1.5 py-0.5">
                {b.brand}
                <span className={b.recoveryPct >= 0.6 ? "text-success font-semibold" : b.recoveryPct >= 0.3 ? "text-primary" : "text-muted-foreground"}>
                  {formatPercent(b.recoveryPct)}
                </span>
              </span>
            ))}
            {brands.length > 5 && <span className="text-xs text-muted-foreground">+{brands.length - 5} more</span>}
          </div>
        )
      },
      className: "min-w-[300px]",
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading marketplace projections...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketplace Projections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {useManifest
              ? compsLevel === "upc"
                ? "Per-UPC eBay sold comps — individual product queries for precise recovery rates and routing"
                : "Per-SKU eBay sold comps — brand+category level recovery rates and routing recommendations"
              : "Model selling on eBay, Amazon, Back Market & own website with higher recovery rates, marketplace fees, ops labor, and shipping costs"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Comps level selector - only visible when manifest mode is on */}
          {useManifest && (
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setCompsLevel("upc")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  compsLevel === "upc"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Barcode className="h-3.5 w-3.5" />
                Per-UPC
              </button>
              <button
                onClick={() => setCompsLevel("sku")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  compsLevel === "sku"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                Brand+Category
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <Database className={`h-4 w-4 ${useManifest ? "text-primary" : "text-muted-foreground"}`} />
            <Label htmlFor="manifest-toggle" className="text-sm font-medium cursor-pointer">
              Use Master Manifest
            </Label>
            <Switch
              id="manifest-toggle"
              checked={useManifest}
              onCheckedChange={setUseManifest}
            />
          </div>
        </div>
      </div>

      {/* Loading / Error States */}
      {useManifest && compsLoading && (
        <Card className="border-primary/40">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <div>
              <p className="font-semibold text-foreground">
                {compsLevel === "upc" ? "Fetching per-UPC eBay sold comps..." : "Fetching per-SKU eBay sold comps..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {compsLevel === "upc"
                  ? "Querying eBay Browse API for each individual product. This may take 1-2 minutes for 150 products."
                  : "Querying eBay Browse API for each brand + category combo. This may take 30-60 seconds."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {useManifest && compsError && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="p-2 rounded-full bg-destructive/20">
              <Database className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Comps Issue</p>
              <p className="text-sm text-muted-foreground">{compsError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== MANIFEST MODE: Per-SKU Analysis ===== */}
      {useManifest && skuData && !compsLoading && (
        <>
          {/* Manifest KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              title="Manifest MSRP"
              value={formatCurrency(skuData.totals.totalMSRP)}
              icon={DollarSign}
            />
            <KPICard
              title="Total Items"
              value={skuData.totals.totalItems.toLocaleString()}
              icon={Package}
            />
            <KPICard
              title="Weighted Recovery"
              value={formatPercent(skuData.totals.weightedRecoveryPct)}
              icon={TrendingUp}
            />
            <KPICard
              title="Routable Items (60%+)"
              value={`${Math.round(skuData.totals.routableItems).toLocaleString()} / ${skuData.totals.totalItems.toLocaleString()}`}
              icon={ArrowUpRight}
            />
            <KPICard
              title={compsLevel === "upc" ? "Unique Products" : "Brand+Category SKUs"}
              value={skuData.meta?.uniqueBrandCategories?.toString() || skuData.skus.length.toString()}
              icon={compsLevel === "upc" ? Barcode : Database}
            />
          </div>

          {/* Routing Analysis Card */}
          {skuData.routingAnalysis && (
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  Routing Strategy — 60%+ Recovery to Marketplace, Rest to Wholesale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Marketplace Route */}
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowUpRight className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-success">Marketplace Route</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SKUs</span>
                        <span className="font-mono font-semibold">{skuData.routingAnalysis.marketplace.skuCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Items</span>
                        <span className="font-mono font-semibold">{Math.round(skuData.routingAnalysis.marketplace.totalItems).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MSRP</span>
                        <span className="font-mono">{formatCurrency(skuData.routingAnalysis.marketplace.totalMSRP)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Recovery</span>
                        <span className="font-mono text-success font-semibold">{formatPercent(skuData.routingAnalysis.marketplace.avgRecovery)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="text-muted-foreground">Est. Revenue</span>
                        <span className="font-mono font-semibold">{formatCurrency(skuData.routingAnalysis.marketplace.estimatedRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Net Profit</span>
                        <span className={`font-mono font-bold ${skuData.routingAnalysis.marketplace.estimatedProfit >= 0 ? "text-success" : "text-destructive"}`}>
                          {formatCurrency(skuData.routingAnalysis.marketplace.estimatedProfit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Wholesale Route */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground">Wholesale Route (18%)</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SKUs</span>
                        <span className="font-mono font-semibold">{skuData.routingAnalysis.wholesale.skuCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Items</span>
                        <span className="font-mono font-semibold">{Math.round(skuData.routingAnalysis.wholesale.totalItems).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MSRP</span>
                        <span className="font-mono">{formatCurrency(skuData.routingAnalysis.wholesale.totalMSRP)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="text-muted-foreground">Est. Revenue</span>
                        <span className="font-mono font-semibold">{formatCurrency(skuData.routingAnalysis.wholesale.estimatedRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Net Profit</span>
                        <span className={`font-mono font-bold ${skuData.routingAnalysis.wholesale.estimatedProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                          {formatCurrency(skuData.routingAnalysis.wholesale.estimatedProfit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Combined / Comparison */}
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">Combined Hybrid</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Items</span>
                        <span className="font-mono font-semibold">{Math.round(skuData.routingAnalysis.combined.totalItems).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Revenue</span>
                        <span className="font-mono font-semibold">{formatCurrency(skuData.routingAnalysis.combined.estimatedRevenue)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="font-medium">Hybrid Profit</span>
                        <span className={`font-mono font-bold ${skuData.routingAnalysis.combined.estimatedProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                          {formatCurrency(skuData.routingAnalysis.combined.estimatedProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">vs All Wholesale</span>
                        <span className={`font-mono font-semibold ${skuData.routingAnalysis.combined.estimatedProfit > skuData.routingAnalysis.allWholesale.estimatedProfit ? "text-success" : "text-destructive"}`}>
                          {skuData.routingAnalysis.combined.estimatedProfit > skuData.routingAnalysis.allWholesale.estimatedProfit ? "+" : ""}
                          {formatCurrency(skuData.routingAnalysis.combined.estimatedProfit - skuData.routingAnalysis.allWholesale.estimatedProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">All Wholesale Profit</span>
                        <span className="font-mono">{formatCurrency(skuData.routingAnalysis.allWholesale.estimatedProfit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Per Person (50/50)</span>
                        <span className="font-mono font-bold text-primary">{formatCurrency(skuData.routingAnalysis.combined.estimatedProfit / 2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategy comparison chart */}
                {routingChartData && (
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={routingChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                        <XAxis dataKey="strategy" stroke="oklch(0.65 0.01 260)" fontSize={12} />
                        <YAxis stroke="oklch(0.65 0.01 260)" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.25 0.02 260)", borderRadius: "8px", color: "oklch(0.95 0.01 260)" }}
                          formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="oklch(0.72 0.15 185)" name="Revenue" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name="Net Profit" radius={[4, 4, 0, 0]}>
                          {routingChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "oklch(0.70 0.18 160)" : "oklch(0.55 0.15 30)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Per-channel profit at eBay recovery rate */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CHANNELS.map((ch) => {
              const profit = channelProfit(ebayRecoveryPct, ch.fee)
              return (
                <Card key={ch.name} className="border-border bg-card">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                      <span className="text-xs font-medium text-muted-foreground">{ch.name} ({(ch.fee * 100).toFixed(0)}% fee)</span>
                    </div>
                    <p className={`text-lg font-bold font-mono ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatCurrency(profit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      All inventory at {formatPercent(ebayRecoveryPct)} recovery
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(profit / 2)} each (50/50)
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Per-SKU Breakdown Table */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">
                {compsLevel === "upc"
                  ? `Per-UPC Product Breakdown (${skuData.skus.length} products)`
                  : `Per-SKU Brand + Category Breakdown (${skuData.skus.length} SKUs)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={skuColumns}
                data={skuData.skus as unknown as Record<string, unknown>[]}
                getRowClassName={(row) => {
                  const sku = row as unknown as SKUComps
                  if (sku.routable) return "bg-success/10 border-l-2 border-l-success"
                  if (sku.recoveryPct >= 0.3) return ""
                  return "opacity-60"
                }}
              />
            </CardContent>
          </Card>

          {/* Category Aggregated Table */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">
                Category Summary ({skuData.categories.length} categories)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={categoryColumns}
                data={skuData.categories as unknown as Record<string, unknown>[]}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* ===== THEORETICAL MODE (original behavior when manifest is off) ===== */}
      {!useManifest && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Current Total MSRP"
            value={formatCurrency(totalMSRP)}
            icon={DollarSign}
          />
          <KPICard
            title="Current COGS"
            value={formatCurrency(totalCOGS)}
            icon={TrendingUp}
          />
          <KPICard
            title="COGS % of MSRP"
            value={formatPercent(effectiveCogsPercent)}
            icon={Percent}
          />
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <Label htmlFor="weekly-msrp" className="text-sm text-muted-foreground">
                Weekly MSRP Target
              </Label>
              <Input
                id="weekly-msrp"
                type="number"
                value={weeklyMSRP}
                onChange={(e) => setWeeklyMSRP(Number(e.target.value))}
                className="mt-2 font-mono text-lg font-bold"
                step={5000}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Card (always shown) */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Marketplace Model Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Min Recovery Rate (%)</Label>
              <Input type="number" value={minRecoveryRate} onChange={(e) => setMinRecoveryRate(Number(e.target.value))} className="mt-2 font-mono" min={1} max={100} />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Max Recovery Rate (%)</Label>
              <Input type="number" value={maxRecoveryRate} onChange={(e) => setMaxRecoveryRate(Number(e.target.value))} className="mt-2 font-mono" min={1} max={100} />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Step Size (%)</Label>
              <Input type="number" value={rateStep} onChange={(e) => setRateStep(Number(e.target.value))} className="mt-2 font-mono" min={1} max={20} />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Ops Fee Rate (%)</Label>
              <Input type="number" value={opsFeeRate} onChange={(e) => setOpsFeeRate(Number(e.target.value))} className="mt-2 font-mono" min={0} max={100} step={1} />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Shipping / Unit ($)</Label>
              <Input type="number" value={shippingPerUnit} onChange={(e) => setShippingPerUnit(Number(e.target.value))} className="mt-2 font-mono" min={0} step={1} />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Est. Units</Label>
              <Input type="number" value={estimatedMonthlyUnits} disabled className="mt-2 font-mono text-muted-foreground" />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {recoveryRates.length} scenarios from {minRecoveryRate}% to {maxRecoveryRate}% in {rateStep}% increments
            &middot; Ops {opsFeeRate}% of revenue
            &middot; Shipping {formatCurrency(totalShippingCost)} ({estimatedMonthlyUnits.toLocaleString()} units &times; ${shippingPerUnit})
            {useManifest && ebayRecoveryPct > 0 && (
              <span className="ml-1">&middot; <strong className="text-primary">eBay comps recovery: {formatPercent(ebayRecoveryPct)}</strong></span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Channel Break-Even Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CHANNELS.map((ch) => {
          const be = breakEvenRate(ch.fee)
          return (
            <Card key={ch.name} className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ch.color }} />
                  <span className="text-sm font-medium text-muted-foreground">{ch.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{(ch.fee * 100).toFixed(0)}% fee</span>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">{formatPercent(be)}</p>
                <p className="text-xs text-muted-foreground">Break-even recovery rate</p>
                {useManifest && ebayRecoveryPct > 0 && (
                  <p className={`text-xs font-semibold mt-1 ${ebayRecoveryPct > be ? "text-success" : "text-destructive"}`}>
                    {ebayRecoveryPct > be ? "Profitable at eBay rate" : "Below break-even"}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart 1: Per-Marketplace Profit Comparison */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Per-Marketplace Net Profit vs Recovery Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={economicData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <defs>
                  <linearGradient id="mp-targetZone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.75 0.16 85)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="oklch(0.75 0.16 85)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis dataKey="rate" stroke="oklch(0.65 0.01 260)" fontSize={12} tickFormatter={(v) => `${Math.round(v)}%`} label={{ value: "Recovery Rate (%)", position: "insideBottom", offset: -10, style: { fill: "oklch(0.65 0.01 260)", fontSize: 14, fontWeight: 600 } }} />
                <YAxis stroke="oklch(0.65 0.01 260)" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} label={{ value: "Net Profit ($)", angle: -90, position: "insideLeft", style: { fill: "oklch(0.65 0.01 260)", fontSize: 14, fontWeight: 600 } }} />
                <Tooltip content={<EconomicTooltip />} cursor={{ stroke: "oklch(0.65 0.01 260)", strokeWidth: 1, strokeDasharray: "5 5" }} />
                <Legend verticalAlign="top" height={36} iconType="line" />

                <ReferenceLine y={0} stroke="oklch(0.75 0.16 85)" strokeWidth={2} strokeDasharray="8 4" />
                <ReferenceArea x1={40} x2={50} fill="url(#mp-targetZone)" fillOpacity={0.5} label={{ value: "Target Zone", fill: "oklch(0.75 0.16 85)", fontSize: 12, fontWeight: 700, position: "insideTop" }} />

                {useManifest && ebayRecoveryPct > 0 && (
                  <ReferenceLine
                    x={Math.round(ebayRecoveryPct * 100)}
                    stroke="oklch(0.72 0.15 185)"
                    strokeWidth={3}
                    strokeDasharray="6 3"
                    label={{ value: `eBay Comps: ${formatPercent(ebayRecoveryPct)}`, fill: "oklch(0.72 0.15 185)", fontSize: 12, fontWeight: 700, position: "top" }}
                  />
                )}

                {CHANNELS.map((ch) => (
                  <Line key={ch.name} type="monotone" dataKey={`profit_${ch.name}`} stroke={ch.color} strokeWidth={2.5} dot={false} name={`${ch.name} (${(ch.fee * 100).toFixed(0)}%)`} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Model Details:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Net Profit</strong> = Gross Revenue &minus; Marketplace Fee &minus; Ops Fee ({opsFeeRate}%) &minus; Shipping ({formatCurrency(totalShippingCost)}) &minus; COGS ({formatCurrency(estimatedCOGS)})</li>
              {useManifest && ebayRecoveryPct > 0 && (
                <li><strong>eBay Comps Recovery</strong>: {formatPercent(ebayRecoveryPct)} weighted avg from {skuData?.skus.length} {compsLevel === "upc" ? "individual products" : "brand+category SKUs"}</li>
              )}
              <li>All profits split 50/50 between Sam &amp; Connor</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Chart 2: Cost Breakdown Waterfall */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Cost Breakdown by Channel at {(targetRate * 100).toFixed(0)}% Recovery
            {useManifest && ebayRecoveryPct > 0 && " (eBay Comps Rate)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis dataKey="channel" stroke="oklch(0.65 0.01 260)" fontSize={12} />
                <YAxis stroke="oklch(0.65 0.01 260)" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.25 0.02 260)", borderRadius: "8px", color: "oklch(0.95 0.01 260)" }} formatter={(value: number, name: string) => [formatCurrency(Math.abs(value)), name]} />
                <Legend />
                <Bar dataKey="grossRevenue" fill="oklch(0.72 0.15 185)" name="Gross Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="marketplaceFee" fill="oklch(0.55 0.15 30)" name="Marketplace Fee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opsFee" fill="oklch(0.65 0.18 40)" name={`Ops Fee (${opsFeeRate}%)`} radius={[4, 4, 0, 0]} />
                <Bar dataKey="shippingCost" fill="oklch(0.60 0.12 260)" name="Shipping" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cogs" fill="oklch(0.55 0.12 30)" name="COGS" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netProfit" fill="oklch(0.70 0.18 160)" name="Net Profit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-card-foreground">Net Profit vs Recovery Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={curveData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                  <XAxis dataKey="rate" stroke="oklch(0.65 0.01 260)" fontSize={12} />
                  <YAxis stroke="oklch(0.65 0.01 260)" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChannelTooltip />} />
                  <Legend />
                  {CHANNELS.map((ch) => (
                    <Bar key={ch.name} dataKey={`profit_${ch.name}`} fill={ch.color} name={ch.name} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-card-foreground">ROI by Recovery Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curveData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                  <XAxis dataKey="rate" stroke="oklch(0.65 0.01 260)" fontSize={12} />
                  <YAxis stroke="oklch(0.65 0.01 260)" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<ROITooltip />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="oklch(0.25 0.02 260)" />
                  {CHANNELS.map((ch) => (
                    <Line key={ch.name} type="monotone" dataKey={`roi_${ch.name}`} stroke={ch.color} strokeWidth={2} dot={{ fill: ch.color, strokeWidth: 0, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} name={ch.name} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Comparison Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            Channel Comparison at {(targetRate * 100).toFixed(0)}% Recovery
            {useManifest && ebayRecoveryPct > 0 ? " (eBay Comps Rate)" : ""}
            {" "}({formatCurrency(monthlyMSRP)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={channelColumns} data={channelComparison as unknown as Record<string, unknown>[]} getRowClassName={(row) => (row as unknown as ChannelRow).channel === "Own Website" ? "bg-primary/15 border-l-2 border-l-primary" : ""} />
        </CardContent>
      </Card>

      {/* Key Recovery Scenarios Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            Key Recovery Scenarios ({formatCurrency(monthlyMSRP)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={scenarioColumns}
            data={scenarioTableData as unknown as Record<string, unknown>[]}
            getRowClassName={(row) => {
              const r = (row as unknown as ScenarioRow).recoveryRate
              if (useManifest && ebayRecoveryPct > 0) {
                const diff = Math.abs(r - ebayRecoveryPct)
                if (diff < 0.025) return "bg-primary/15 border-l-2 border-l-primary"
              }
              return r >= 0.4 && r <= 0.5 ? "bg-primary/15 border-l-2 border-l-primary" : ""
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
