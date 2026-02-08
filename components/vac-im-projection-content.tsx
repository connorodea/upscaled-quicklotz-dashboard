"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/kpi-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Wind,
  Snowflake,
  Users,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  AlertTriangle,
  Target,
  Zap,
  BarChart3,
} from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
} from "recharts"

// ── Refurb data from Refurb Projections tab ─────────────────────────
const VAC = {
  name: "Vacuums",
  refurbLow: 23, refurbHigh: 25,
  boxLow: 6, boxHigh: 8,
  passRate: 1.0,
  sellPctLow: 35, sellPctHigh: 50,
  notes: "Model dependent",
  tier: "B" as const,
}

const IM = {
  name: "Ice Makers",
  refurbLow: 23, refurbHigh: 23,
  boxLow: 8, boxHigh: 8,
  passRate: 0.5,
  sellPctLow: 30, sellPctHigh: 45,
  notes: "50% fail rate (mold)",
  tier: "C" as const,
}

function mid(a: number, b: number) {
  return Math.round(((a + b) / 2) * 100) / 100
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${Math.round(v)}`
}

const DarkTooltipStyle = {
  backgroundColor: "oklch(0.18 0.02 260)",
  border: "1px solid oklch(0.25 0.02 260)",
  borderRadius: "8px",
  color: "oklch(0.95 0.01 260)",
}

const TIER_BG: Record<string, string> = {
  S: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  A: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  B: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  C: "bg-red-500/15 text-red-400 border-red-500/30",
}

// ── Defaults ────────────────────────────────────────────────────────
const DEFAULT_PROCESSORS = 10
const DEFAULT_UNITS_PER_WEEK = 750
const DEFAULT_WEEKS = 12

// ── Component ───────────────────────────────────────────────────────
export function VacImProjectionContent() {
  const [processors, setProcessors] = useState(DEFAULT_PROCESSORS)
  const [unitsPerWeek, setUnitsPerWeek] = useState(DEFAULT_UNITS_PER_WEEK)
  const [weeks, setWeeks] = useState(DEFAULT_WEEKS)
  const [vacPct, setVacPct] = useState(60)
  const [avgCogs, setAvgCogs] = useState(15)
  const [vacMsrp, setVacMsrp] = useState(250)
  const [imMsrp, setImMsrp] = useState(180)
  const [vacCogs, setVacCogs] = useState(15)
  const [imCogs, setImCogs] = useState(15)
  const [needsBox, setNeedsBox] = useState(true)
  const [dbLoaded, setDbLoaded] = useState(false)
  const [vacDbData, setVacDbData] = useState<{qty: number, msrp: number, cogs: number} | null>(null)
  const [imDbData, setImDbData] = useState<{qty: number, msrp: number, cogs: number} | null>(null)

  // Fetch database values for Vacuums and Ice Makers
  useEffect(() => {
    fetch("/api/refurb-categories")
      .then(r => r.json())
      .then(res => {
        if (res?.success && res?.categories) {
          const cats = res.categories
          
          // Find vacuum category
          const vacData = cats.find((c: any) => 
            c.category.toLowerCase().includes("vacuum") || 
            c.category.toLowerCase().includes("floorcare")
          )
          
          // Find ice maker category  
          const imData = cats.find((c: any) =>
            c.category.toLowerCase().includes("ice maker") ||
            c.category.toLowerCase() === "ice makers"
          )
          
          // Update state with database values
          if (vacData) {
            setVacMsrp(Math.round(vacData.avgMsrp))
            setVacCogs(Math.round(vacData.avgCogsPerUnit))
            setVacDbData({ qty: vacData.totalQty, msrp: Math.round(vacData.avgMsrp), cogs: Math.round(vacData.avgCogsPerUnit) })
          }
          if (imData) {
            setImMsrp(Math.round(imData.avgMsrp))
            setImCogs(Math.round(imData.avgCogsPerUnit))
            setImDbData({ qty: imData.totalQty, msrp: Math.round(imData.avgMsrp), cogs: Math.round(imData.avgCogsPerUnit) })
          }
          setDbLoaded(true)
        }
      })
      .catch(() => setDbLoaded(true))
  }, [])

  const imPct = 100 - vacPct

  const projection = useMemo(() => {
    const unitsPerProcessor = Math.round(unitsPerWeek / processors)

    // Vacuum
    const vacUnitsWk = Math.round(unitsPerWeek * (vacPct / 100))
    const vacRefurb = mid(VAC.refurbLow, VAC.refurbHigh)
    const vacBox = needsBox ? mid(VAC.boxLow, VAC.boxHigh) : 0
    const vacAllIn = vacCogs + vacRefurb + vacBox
    const vacSellPct = mid(VAC.sellPctLow, VAC.sellPctHigh)
    const vacSellPrice = Math.round(vacMsrp * vacSellPct / 100)
    const vacPassable = Math.round(vacUnitsWk * VAC.passRate)
    const vacRevenueWk = vacSellPrice * vacPassable
    const vacCostWk = vacAllIn * vacUnitsWk
    const vacProfitWk = vacRevenueWk - vacCostWk
    const vacMarginUnit = vacSellPrice - vacAllIn
    const vacROI = vacCostWk > 0 ? (vacProfitWk / vacCostWk) * 100 : 0

    // Ice Makers
    const imUnitsWk = Math.round(unitsPerWeek * (imPct / 100))
    const imRefurb = mid(IM.refurbLow, IM.refurbHigh)
    const imBox = needsBox ? mid(IM.boxLow, IM.boxHigh) : 0
    const imAllIn = imCogs + imRefurb + imBox
    const imSellPct = mid(IM.sellPctLow, IM.sellPctHigh)
    const imSellPrice = Math.round(imMsrp * imSellPct / 100)
    const imPassable = Math.round(imUnitsWk * IM.passRate)
    const imRevenueWk = imSellPrice * imPassable
    const imCostWk = imAllIn * imUnitsWk
    const imProfitWk = imRevenueWk - imCostWk
    const imMarginUnit = (imSellPrice * IM.passRate) - imAllIn
    const imROI = imCostWk > 0 ? (imProfitWk / imCostWk) * 100 : 0

    // Totals
    const totalRevenueWk = vacRevenueWk + imRevenueWk
    const totalCostWk = vacCostWk + imCostWk
    const totalProfitWk = vacProfitWk + imProfitWk
    const totalPassable = vacPassable + imPassable
    const totalFailed = unitsPerWeek - totalPassable
    const blendedROI = totalCostWk > 0 ? (totalProfitWk / totalCostWk) * 100 : 0
    const marginPct = totalRevenueWk > 0 ? (totalProfitWk / totalRevenueWk) * 100 : 0

    // Timeline
    const timeline = Array.from({ length: weeks }, (_, i) => {
      const wk = i + 1
      return {
        week: `Wk ${wk}`,
        vacRevenue: vacRevenueWk * wk,
        imRevenue: imRevenueWk * wk,
        totalRevenue: totalRevenueWk * wk,
        totalCost: totalCostWk * wk,
        totalProfit: totalProfitWk * wk,
        cumUnits: unitsPerWeek * wk,
      }
    })

    // Weekly stacked bar data
    const weeklyBars = Array.from({ length: Math.min(weeks, 12) }, (_, i) => ({
      week: `Wk ${i + 1}`,
      vacProfit: vacProfitWk,
      imProfit: imProfitWk,
      total: totalProfitWk,
    }))

    return {
      unitsPerProcessor,
      vacUnitsWk, vacRefurb, vacBox, vacAllIn, vacSellPrice, vacSellPct,
      vacPassable, vacRevenueWk, vacCostWk, vacProfitWk, vacMarginUnit, vacROI,
      imUnitsWk, imRefurb, imBox, imAllIn, imSellPrice, imSellPct,
      imPassable, imRevenueWk, imCostWk, imProfitWk, imMarginUnit, imROI,
      totalRevenueWk, totalCostWk, totalProfitWk,
      totalPassable, totalFailed, blendedROI, marginPct, blendedRecoveryRate: Math.round((vacSellPct * vacPct + imSellPct * imPct) / 100),
      totalRevenuePeriod: totalRevenueWk * weeks,
      totalCostPeriod: totalCostWk * weeks,
      totalProfitPeriod: totalProfitWk * weeks,
      totalUnitsPeriod: unitsPerWeek * weeks,
      timeline, weeklyBars,
    }
  }, [processors, unitsPerWeek, weeks, vacPct, vacCogs, imCogs, vacMsrp, imMsrp, needsBox, imPct])

  // Charts
  const mixPie = [
    { name: "Vacuums", value: projection.vacUnitsWk, fill: "oklch(0.75 0.16 85)" },
    { name: "Ice Makers", value: projection.imUnitsWk, fill: "oklch(0.72 0.15 185)" },
  ]

  const passFailPie = [
    { name: "Sellable", value: projection.totalPassable, fill: "oklch(0.70 0.18 160)" },
    { name: "Failed QC", value: projection.totalFailed, fill: "oklch(0.65 0.20 30)" },
  ]

  const unitEconData = [
    {
      name: "Vacuums", cogs: vacCogs,
      refurb: projection.vacRefurb,
      box: projection.vacBox,
      margin: projection.vacMarginUnit,
    },
    {
      name: "Ice Makers", cogs: imCogs,
      refurb: projection.imRefurb,
      box: projection.imBox,
      margin: projection.imMarginUnit,
    },
  ]

  // Sensitivity: how vacPct affects total weekly profit
  const mixSensitivity = useMemo(() => {
    const points = []
    for (let vp = 0; vp <= 100; vp += 5) {
      const ip = 100 - vp
      const vUnits = Math.round(unitsPerWeek * (vp / 100))
      const iUnits = Math.round(unitsPerWeek * (ip / 100))
      const vRefurb = mid(VAC.refurbLow, VAC.refurbHigh)
      const vBox = needsBox ? mid(VAC.boxLow, VAC.boxHigh) : 0
      const vAllIn = avgCogs + vRefurb + vBox
      const vSell = Math.round(vacMsrp * mid(VAC.sellPctLow, VAC.sellPctHigh) / 100)
      const vProfit = (vSell * Math.round(vUnits * VAC.passRate)) - (vAllIn * vUnits)

      const iRefurb = mid(IM.refurbLow, IM.refurbHigh)
      const iBox = needsBox ? mid(IM.boxLow, IM.boxHigh) : 0
      const iAllIn = avgCogs + iRefurb + iBox
      const iSell = Math.round(imMsrp * mid(IM.sellPctLow, IM.sellPctHigh) / 100)
      const iProfit = (iSell * Math.round(iUnits * IM.passRate)) - (iAllIn * iUnits)

      points.push({
        mix: `${vp}/${ip}`,
        vacProfit: vProfit,
        imProfit: iProfit,
        total: vProfit + iProfit,
      })
    }
    return points
  }, [unitsPerWeek, vacCogs, imCogs, vacMsrp, imMsrp, needsBox])

  // Processor utilization
  const processorData = useMemo(() => {
    return Array.from({ length: processors }, (_, i) => {
      const perProcessor = Math.round(unitsPerWeek / processors)
      const vacShare = Math.round(perProcessor * (vacPct / 100))
      const imShare = perProcessor - vacShare
      return {
        name: `P${i + 1}`,
        vacuums: vacShare,
        iceMakers: imShare,
      }
    })
  }, [processors, unitsPerWeek, vacPct])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vac / Ice Maker Projection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Weekly throughput model — {unitsPerWeek.toLocaleString()} units/wk across {processors} processors
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Units / Processor" value={String(projection.unitsPerProcessor)} />
        <KPICard title="Sellable / Wk" value={projection.totalPassable.toLocaleString()} />
        <KPICard title="Revenue / Wk" value={fmtK(projection.totalRevenueWk)} />
        <KPICard
          title="Profit / Wk"
          value={fmtK(projection.totalProfitWk)}
          subtitle={`@ ${projection.blendedRecoveryRate}% blended recovery`}
          delta={projection.blendedROI}
          deltaLabel="ROI"
        />
        <KPICard title="Margin %" value={`${projection.marginPct.toFixed(1)}%`} />
        <KPICard
          title={`${weeks}-Wk Profit`}
          value={fmtK(projection.totalProfitPeriod)}
          deltaLabel="projected"
        />
      </div>

      {/* Controls */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">Model Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <Label className="text-sm text-muted-foreground">Processors</Label>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-card-foreground w-8">{processors}</span>
                <Slider value={[processors]} onValueChange={(v) => setProcessors(v[0])} min={1} max={30} step={1} className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Units / Week</Label>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-card-foreground w-16">{unitsPerWeek.toLocaleString()}</span>
                <Slider value={[unitsPerWeek]} onValueChange={(v) => setUnitsPerWeek(v[0])} min={100} max={3000} step={50} className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Projection Weeks</Label>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-card-foreground w-8">{weeks}</span>
                <Slider value={[weeks]} onValueChange={(v) => setWeeks(v[0])} min={1} max={52} step={1} className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Vac / IM Mix</Label>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-card-foreground w-20">{vacPct}% / {imPct}%</span>
                <Slider value={[vacPct]} onValueChange={(v) => setVacPct(v[0])} min={0} max={100} step={5} className="flex-1" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
            <div>
              <Label className="text-sm text-muted-foreground">Vacuum COGS / Unit</Label>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-card-foreground w-12">${avgCogs}</span>
                <Slider value={[vacCogs]} onValueChange={(v) => setVacCogs(v[0])} min={1} max={100} step={1} className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Vacuum Avg MSRP</Label>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-card-foreground w-16">${vacMsrp}</span>
                <Slider value={[vacMsrp]} onValueChange={(v) => setVacMsrp(v[0])} min={50} max={800} step={10} className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Ice Maker Avg MSRP</Label>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-card-foreground w-16">${imMsrp}</span>
                <Slider value={[imMsrp]} onValueChange={(v) => setImMsrp(v[0])} min={50} max={800} step={10} className="flex-1" />
              </div>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-3">
                <Switch checked={needsBox} onCheckedChange={setNeedsBox} />
                <Label className="text-sm text-muted-foreground">New Box Required</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">Weekly Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tier</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Units/Wk</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Sellable</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Refurb</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Box</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">All-In</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Sell Price</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Pass Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Margin/Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Revenue/Wk</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Cost/Wk</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Profit/Wk</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">ROI</th>
                </tr>
              </thead>
              <tbody>
                {/* Vacuums */}
                <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-card-foreground">
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4" style={{ color: "oklch(0.75 0.16 85)" }} />
                      Vacuums
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md border text-xs font-bold ${TIER_BG[VAC.tier]}`}>{VAC.tier}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{projection.vacUnitsWk.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{projection.vacPassable.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">${projection.vacRefurb}</td>
                  <td className="px-4 py-3 text-right font-mono">${projection.vacBox}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: "oklch(0.75 0.16 85)" }}>${projection.vacAllIn.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {fmt(projection.vacSellPrice)}
                    <span className="text-xs text-muted-foreground ml-1">({projection.vacSellPct}%)</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className="bg-success/20 text-success border-success/30">100%</Badge>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${projection.vacMarginUnit >= 0 ? "text-primary" : "text-destructive"}`}>
                    ${projection.vacMarginUnit.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(projection.vacRevenueWk)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(projection.vacCostWk)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${projection.vacProfitWk >= 0 ? "text-primary" : "text-destructive"}`}>
                    {fmt(projection.vacProfitWk)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${projection.vacROI >= 0 ? "text-primary" : "text-destructive"}`}>
                    {projection.vacROI.toFixed(0)}%
                  </td>
                </tr>

                {/* Ice Makers */}
                <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-card-foreground">
                    <div className="flex items-center gap-2">
                      <Snowflake className="h-4 w-4" style={{ color: "oklch(0.72 0.15 185)" }} />
                      Ice Makers
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md border text-xs font-bold ${TIER_BG[IM.tier]}`}>{IM.tier}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{projection.imUnitsWk.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-destructive font-semibold">{projection.imPassable.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">${projection.imRefurb}</td>
                  <td className="px-4 py-3 text-right font-mono">${projection.imBox}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: "oklch(0.75 0.16 85)" }}>${projection.imAllIn.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {fmt(projection.imSellPrice)}
                    <span className="text-xs text-muted-foreground ml-1">({projection.imSellPct}%)</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="destructive">50%</Badge>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${projection.imMarginUnit >= 0 ? "text-primary" : "text-destructive"}`}>
                    ${projection.imMarginUnit.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(projection.imRevenueWk)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(projection.imCostWk)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${projection.imProfitWk >= 0 ? "text-primary" : "text-destructive"}`}>
                    {fmt(projection.imProfitWk)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${projection.imROI >= 0 ? "text-primary" : "text-destructive"}`}>
                    {projection.imROI.toFixed(0)}%
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-3 text-card-foreground" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right font-mono">{unitsPerWeek.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{projection.totalPassable.toLocaleString()}</td>
                  <td className="px-4 py-3" colSpan={5}></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(projection.totalRevenueWk)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(projection.totalCostWk)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${projection.totalProfitWk >= 0 ? "text-primary" : "text-destructive"}`}>
                    {fmt(projection.totalProfitWk)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${projection.blendedROI >= 0 ? "text-primary" : "text-destructive"}`}>
                    {projection.blendedROI.toFixed(0)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 1: Pie charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">Product Mix (Units/Wk)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={mixPie} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} stroke="oklch(0.18 0.02 260)" strokeWidth={2}>
                  {mixPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={DarkTooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Units"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              Sellable vs Failed QC (Weekly)
              <span className="text-xs text-muted-foreground font-normal ml-2">Ice makers: 50% mold fail</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={passFailPie} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} stroke="oklch(0.18 0.02 260)" strokeWidth={2}>
                  {passFailPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={DarkTooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Units"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Unit Economics Waterfall */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">Unit Economics Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={unitEconData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "oklch(0.65 0.01 260)" }} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12, fill: "oklch(0.65 0.01 260)" }} />
              <Tooltip contentStyle={DarkTooltipStyle} formatter={(v: number) => [`$${v}`, ""]} />
              <Legend />
              <Bar dataKey="cogs" name="COGS" fill="oklch(0.65 0.20 30)" stackId="cost" radius={[0, 0, 0, 0]} />
              <Bar dataKey="refurb" name="Refurb" fill="oklch(0.72 0.15 185)" stackId="cost" radius={[0, 0, 0, 0]} />
              <Bar dataKey="box" name="Box" fill="oklch(0.55 0.15 280)" stackId="cost" radius={[4, 4, 0, 0]} />
              <Bar dataKey="margin" name="Margin/Unit" radius={[4, 4, 0, 0]}>
                {unitEconData.map((entry, i) => (
                  <Cell key={i} fill={entry.margin >= 0 ? "oklch(0.70 0.18 160)" : "oklch(0.65 0.20 30)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Mix Sensitivity */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">Mix Sensitivity — Weekly Profit by Vac/IM Split</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={mixSensitivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
              <XAxis dataKey="mix" tick={{ fontSize: 11, fill: "oklch(0.65 0.01 260)" }} label={{ value: "Vac% / IM%", position: "insideBottom", offset: -5, fill: "oklch(0.55 0.01 260)", fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtK(v)} tick={{ fontSize: 12, fill: "oklch(0.65 0.01 260)" }} />
              <Tooltip contentStyle={DarkTooltipStyle} formatter={(v: number) => [fmt(v), ""]} />
              <Legend />
              <Area type="monotone" dataKey="vacProfit" name="Vacuum Profit" fill="oklch(0.75 0.16 85 / 0.2)" stroke="oklch(0.75 0.16 85)" strokeWidth={2} />
              <Area type="monotone" dataKey="imProfit" name="Ice Maker Profit" fill="oklch(0.72 0.15 185 / 0.2)" stroke="oklch(0.72 0.15 185)" strokeWidth={2} />
              <Line type="monotone" dataKey="total" name="Total Profit" stroke="oklch(0.70 0.18 160)" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Processor Utilization */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Processor Utilization — {projection.unitsPerProcessor} units/processor/wk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={processorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "oklch(0.65 0.01 260)" }} />
              <YAxis tick={{ fontSize: 12, fill: "oklch(0.65 0.01 260)" }} />
              <Tooltip contentStyle={DarkTooltipStyle} />
              <Legend />
              <Bar dataKey="vacuums" name="Vacuums" fill="oklch(0.75 0.16 85)" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="iceMakers" name="Ice Makers" fill="oklch(0.72 0.15 185)" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cumulative Timeline */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">{weeks}-Week Cumulative Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Total Revenue: <strong className="text-card-foreground">{fmt(projection.totalRevenuePeriod)}</strong></span>
            <span>Total Cost: <strong className="text-card-foreground">{fmt(projection.totalCostPeriod)}</strong></span>
            <span>Total Profit: <strong className={projection.totalProfitPeriod >= 0 ? "text-primary" : "text-destructive"}>{fmt(projection.totalProfitPeriod)}</strong></span>
            <span>Units: <strong className="text-card-foreground">{projection.totalUnitsPeriod.toLocaleString()}</strong></span>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={projection.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: "oklch(0.65 0.01 260)" }} />
              <YAxis tickFormatter={(v) => fmtK(v)} tick={{ fontSize: 12, fill: "oklch(0.65 0.01 260)" }} />
              <Tooltip contentStyle={DarkTooltipStyle} formatter={(v: number) => [fmt(v), ""]} />
              <Legend />
              <Line type="monotone" dataKey="vacRevenue" name="Vacuum Revenue" stroke="oklch(0.75 0.16 85)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="imRevenue" name="Ice Maker Revenue" stroke="oklch(0.72 0.15 185)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="totalProfit" name="Total Profit" stroke="oklch(0.70 0.18 160)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="totalCost" name="Total Cost" stroke="oklch(0.65 0.20 30)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Period Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">{weeks}-Week Period Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Units Processed</p>
              <p className="font-mono text-lg font-bold text-card-foreground">{projection.totalUnitsPeriod.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Investment</p>
              <p className="font-mono text-lg font-bold text-card-foreground">{fmt(projection.totalCostPeriod)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="font-mono text-lg font-bold text-card-foreground">{fmt(projection.totalRevenuePeriod)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Profit</p>
              <p className={`font-mono text-lg font-bold ${projection.totalProfitPeriod >= 0 ? "text-primary" : "text-destructive"}`}>
                {fmt(projection.totalProfitPeriod)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Blended ROI</p>
              <p className={`font-mono text-lg font-bold ${projection.blendedROI >= 0 ? "text-primary" : "text-destructive"}`}>
                {projection.blendedROI.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
