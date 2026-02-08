"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { KPICard } from "@/components/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RefreshCw,
  DollarSign,
  Package,
  Play,
  Loader2,
  ExternalLink,
  FileSpreadsheet,
  MapPin,
  Truck,
  Upload,
  Target,
  Zap,
  Timer,
  TrendingDown,
  Search,
} from "lucide-react"

interface Deal {
  auction_id: string
  marketplace: string
  title: string
  category: string
  condition: string
  current_bid: number
  msrp_total: number
  msrp_pct: number
  unit_count: number
  deal_score: number
  time_remaining: string
  ends_at: string | null
  auction_url: string
  seller: string
  location: string
  retailer_name: string
  retailer_color: string
  lot_type: string
  pallet_count: number
  thumbnail_url: string | null
  manifest_url: string | null
  shipping_type: string
  bid_count: number
  projected_profit: number
  roi_estimate: number
  priority: string
}

interface ScanStatus {
  status: string
  last_scan: string | null
  deals_found: number
  error?: string
}

interface Stats {
  by_retailer: Record<string, { count: number; value: number; color: string }>
  by_category: Record<string, { count: number; value: number }>
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)

const formatNumber = (val: number) =>
  new Intl.NumberFormat("en-US").format(val)

const parseTimeRemaining = (tr: string): number => {
  if (!tr || tr === "Unknown") return Infinity
  if (tr === "Ended") return 0
  let mins = 0
  const d = tr.match(/(\d+)d/)
  const h = tr.match(/(\d+)h/)
  const m = tr.match(/(\d+)m/)
  if (d) mins += parseInt(d[1]) * 1440
  if (h) mins += parseInt(h[1]) * 60
  if (m) mins += parseInt(m[1])
  return mins
}

const getUrgencyBadge = (mins: number) => {
  if (mins <= 30) return { label: "SNIPE NOW", variant: "destructive" as const }
  if (mins <= 120) return { label: "ENDING SOON", variant: "default" as const }
  if (mins <= 360) return { label: "TODAY", variant: "secondary" as const }
  return null
}

export default function BstEtlPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    status: "idle",
    last_scan: null,
    deals_found: 0,
  })
  const [msrpMin, setMsrpMin] = useState("0")
  const [msrpMax, setMsrpMax] = useState("10")
  const [retailerFilter, setRetailerFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState<Stats | null>(null)
  const [apiStatus, setApiStatus] = useState("checking")
  const [sortBy, setSortBy] = useState("ending_soonest")

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/bst-etl?endpoint=deals")
      if (res.ok) {
        const data = await res.json()
        setDeals(data.deals || [])
        setApiStatus("connected")
      }
    } catch (e) {
      console.error(e)
      setApiStatus("disconnected")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/bst-etl?endpoint=stats")
      if (res.ok) setStats(await res.json())
    } catch (e) {
      console.error(e)
    }
  }, [])

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/bst-etl?endpoint=scan/status")
      if (res.ok) {
        const s = await res.json()
        setScanStatus(s)
        setScanning(s.status === "scanning")
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    fetchDeals()
    fetchStats()
    checkStatus()
  }, [fetchDeals, fetchStats, checkStatus])

  useEffect(() => {
    if (scanning) {
      const i = setInterval(() => {
        checkStatus()
        if (scanStatus.status === "completed") {
          fetchDeals()
          fetchStats()
          setScanning(false)
        }
      }, 5000)
      return () => clearInterval(i)
    }
  }, [scanning, scanStatus.status, checkStatus, fetchDeals, fetchStats])

  const handleScan = async () => {
    setScanning(true)
    try {
      await fetch("/api/bst-etl?endpoint=scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min_msrp_pct: 0, max_msrp_pct: 100, min_units: 0 }),
      })
    } catch (e) {
      console.error(e)
      setScanning(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/bst-etl-upload", { method: "POST", body: fd })
      if (res.ok) {
        fetchDeals()
        fetchStats()
        checkStatus()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setScanning(false)
      e.target.value = ""
    }
  }

  const filteredDeals = useMemo(() => {
    const minVal = parseFloat(msrpMin) || 0
    const maxVal = parseFloat(msrpMax) || 100
    let result = deals
      .filter((d) => d.msrp_pct >= minVal && d.msrp_pct <= maxVal)
      .filter((d) => retailerFilter === "all" || d.retailer_name === retailerFilter)
      .filter(
        (d) =>
          !searchQuery ||
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.category.toLowerCase().includes(searchQuery.toLowerCase())
      )

    switch (sortBy) {
      case "ending_soonest":
        result.sort((a, b) => parseTimeRemaining(a.time_remaining) - parseTimeRemaining(b.time_remaining))
        break
      case "msrp_pct_low":
        result.sort((a, b) => a.msrp_pct - b.msrp_pct)
        break
      case "msrp_pct_high":
        result.sort((a, b) => b.msrp_pct - a.msrp_pct)
        break
      case "price_low":
        result.sort((a, b) => a.current_bid - b.current_bid)
        break
      case "price_high":
        result.sort((a, b) => b.current_bid - a.current_bid)
        break
      case "profit":
        result.sort((a, b) => b.projected_profit - a.projected_profit)
        break
      case "score":
        result.sort((a, b) => b.deal_score - a.deal_score)
        break
    }

    return result
  }, [deals, msrpMin, msrpMax, retailerFilter, searchQuery, sortBy])

  const snipeDeals = filteredDeals.filter(
    (d) => parseTimeRemaining(d.time_remaining) <= 120 && d.msrp_pct <= 8
  )
  const endingSoon = filteredDeals.filter((d) => parseTimeRemaining(d.time_remaining) <= 360)
  const retailers = stats?.by_retailer ? Object.keys(stats.by_retailer) : []
  const totalValue = filteredDeals.reduce((s, d) => s + d.current_bid, 0)
  const avgMsrp =
    filteredDeals.length > 0
      ? (filteredDeals.reduce((s, d) => s + d.msrp_pct, 0) / filteredDeals.length).toFixed(1)
      : "0"

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pt-16 md:pt-0 md:ml-64 min-h-screen p-3 sm:p-4 md:p-6 overflow-x-hidden">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">BST-ETL</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Auction sniping &mdash; find low MSRP % deals before they close
                {apiStatus === "connected" ? (
                  <span className="ml-2 text-success">&bull; Connected</span>
                ) : (
                  <span className="ml-2 text-destructive">&bull; Offline</span>
                )}
                {scanStatus.last_scan && (
                  <span className="ml-2">
                    &middot; Last scan{" "}
                    {new Date(scanStatus.last_scan).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="csv-upload"
                className="hidden"
                accept=".csv,.xlsx"
                onChange={handleUpload}
              />
              <Button variant="outline" size="icon" asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                </label>
              </Button>
              <button
                onClick={() => {
                  fetchDeals()
                  fetchStats()
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <Button onClick={handleScan} disabled={scanning}>
                {scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {scanning ? "Scanning..." : "Scan for Deals"}
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Snipe Ready"
              value={String(snipeDeals.length)}
            />
            <KPICard title="Ending Today" value={String(endingSoon.length)} />
            <KPICard title="Avg MSRP %" value={`${avgMsrp}%`} />
            <KPICard
              title="Total Value"
              value={formatCurrency(totalValue)}
            />
          </div>

          {/* Snipe Alert */}
          {snipeDeals.length > 0 && (
            <Card className="border-destructive/40">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="p-2 rounded-full bg-destructive/20">
                  <Zap className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {snipeDeals.length} auction
                    {snipeDeals.length !== 1 ? "s" : ""} ready to snipe
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ending within 2 hours at &le;8% MSRP
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters Row */}
          <div className="flex gap-4 flex-wrap items-end">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search auctions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                MSRP %
              </span>
              <Input
                type="number"
                value={msrpMin}
                onChange={(e) => setMsrpMin(e.target.value)}
                className="w-16 text-center"
                step="0.5"
              />
              <span className="text-sm text-muted-foreground">&mdash;</span>
              <Input
                type="number"
                value={msrpMax}
                onChange={(e) => setMsrpMax(e.target.value)}
                className="w-16 text-center"
                step="0.5"
              />
            </div>
            <Select value={retailerFilter} onValueChange={setRetailerFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Retailer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Retailers</SelectItem>
                {retailers.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ending_soonest">Ending Soonest</SelectItem>
                <SelectItem value="msrp_pct_low">Lowest MSRP %</SelectItem>
                <SelectItem value="msrp_pct_high">Highest MSRP %</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="profit">Highest Profit</SelectItem>
                <SelectItem value="score">Best Score</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Deals Table */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">
                Auctions ({filteredDeals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <p className="text-muted-foreground">Loading auctions...</p>
                </div>
              ) : filteredDeals.length > 0 ? (
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Time Left
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Retailer
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Category
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Units
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Current Bid
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          MSRP
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          % of MSRP
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Est. Profit
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeals.map((deal) => {
                        const mins = parseTimeRemaining(deal.time_remaining)
                        const urgency = getUrgencyBadge(mins)
                        const isSnipeable = mins <= 120 && deal.msrp_pct <= 8

                        return (
                          <tr
                            key={deal.auction_id}
                            className={`border-b border-border transition-colors ${
                              isSnipeable
                                ? "bg-destructive/5 hover:bg-destructive/10"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-mono font-semibold ${
                                    mins <= 30
                                      ? "text-destructive"
                                      : mins <= 120
                                        ? "text-warning"
                                        : mins <= 360
                                          ? "text-chart-3"
                                          : "text-muted-foreground"
                                  }`}
                                >
                                  {deal.time_remaining}
                                </span>
                                {urgency && (
                                  <Badge
                                    variant={urgency.variant}
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {urgency.label}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex rounded px-2 py-0.5 text-xs font-semibold text-white"
                                style={{ backgroundColor: deal.retailer_color }}
                              >
                                {deal.retailer_name}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <div
                                className="truncate text-foreground"
                                title={deal.title}
                              >
                                {deal.title}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {deal.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  {deal.shipping_type}
                                </span>
                                {deal.bid_count > 0 && (
                                  <span>{deal.bid_count} bids</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {deal.category}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatNumber(deal.unit_count)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">
                              {formatCurrency(deal.current_bid)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                              {formatCurrency(deal.msrp_total)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              <span
                                className={
                                  deal.msrp_pct <= 5
                                    ? "text-success font-semibold"
                                    : deal.msrp_pct <= 8
                                      ? "text-primary font-semibold"
                                      : "text-muted-foreground"
                                }
                              >
                                {deal.msrp_pct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-success">
                              +{formatCurrency(deal.projected_profit)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                {deal.manifest_url && (
                                  <a
                                    href={deal.manifest_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                                    title="View manifest"
                                  >
                                    <FileSpreadsheet className="h-3 w-3" />
                                  </a>
                                )}
                                <a
                                  href={deal.auction_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    isSnipeable
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                      : "bg-primary/10 text-primary hover:bg-primary/20"
                                  }`}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {isSnipeable ? "Snipe" : "Bid"}
                                </a>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">
                    No auctions found
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your MSRP % range or run a new scan
                  </p>
                  <Button
                    onClick={handleScan}
                    disabled={scanning}
                    className="mt-4"
                  >
                    <Play className="h-4 w-4" />
                    Run Scan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
