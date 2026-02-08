"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/kpi-card"
import { DataTable, type Column } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUp, DollarSign, Gavel, Percent } from "lucide-react"
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
  Area,
  AreaChart,
  ComposedChart,
  ReferenceArea,
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

interface AuctionScenario {
  id: string
  scenario: string
  recoveryRate: number
  grossRevenue: number
  opsFee: number
  cogs: number
  netProfit: number
  samShare: number
  connorShare: number
  roi: number
}

interface WeeklyScenario {
  weeklyMSRP: number
  monthlyMSRP: number
  estimatedCOGS: number
  netProfitAt18: number
  netProfitAt20: number
  netProfitAt25: number
}

interface Settings {
  auctionRecoveryRate: number
  wholesaleRecoveryRate: number
  defaultWeeklyMSRP: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

const OPS_FEE_RATE = 0.30 // 30% ops fee for auctions

export function AuctionProjectionsContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [weeklyMSRP, setWeeklyMSRP] = useState(500000)
  const [minRecoveryRate, setMinRecoveryRate] = useState(20)
  const [maxRecoveryRate, setMaxRecoveryRate] = useState(40)
  const [rateStep, setRateStep] = useState(5)

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings)
          setWeeklyMSRP(data.settings.defaultWeeklyMSRP || 500000)
          setMinRecoveryRate(data.settings.auctionRecoveryRate || 20)
        }
      })
      .catch((err) => console.error("Failed to load settings:", err))

    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.orders) {
          setOrders(data.orders)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch orders:", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading auction projections...</p>
      </div>
    )
  }

  const totalMSRP = orders.reduce((sum, order) => sum + order.totalMSRP, 0)
  const totalCOGS = orders.reduce((sum, order) => sum + order.totalAllIn, 0)
  const avgCogsPercent = totalMSRP > 0 ? totalCOGS / totalMSRP : 0.048

  const generateWeeklyScenarios = () => {
    const scenarios = []
    const target = weeklyMSRP
    const multipliers = [0.5, 0.75, 1.0, 1.25, 1.5]

    for (const multiplier of multipliers) {
      const weekly = Math.round(target * multiplier / 5000) * 5000
      const monthly = weekly * 4
      const estimatedCOGS = monthly * avgCogsPercent

      const calcNetProfit = (rate: number) => {
        const grossRev = monthly * rate
        const opsFee = grossRev * OPS_FEE_RATE
        return grossRev - opsFee - estimatedCOGS
      }

      scenarios.push({
        weeklyMSRP: weekly,
        monthlyMSRP: monthly,
        estimatedCOGS,
        netProfitAt18: calcNetProfit(0.18),
        netProfitAt20: calcNetProfit(0.20),
        netProfitAt25: calcNetProfit(0.25),
      })
    }
    return scenarios
  }

  const weeklyScenarios: WeeklyScenario[] = generateWeeklyScenarios()
  const monthlyMSRP = weeklyMSRP * 4
  const estimatedCOGS = monthlyMSRP * avgCogsPercent

  const generateRecoveryRates = () => {
    const rates = []
    const min = Math.max(1, minRecoveryRate)
    const max = Math.min(100, maxRecoveryRate)
    const step = Math.max(1, rateStep)
    for (let i = min; i <= max; i += step) {
      rates.push(i / 100)
    }
    return rates
  }

  const recoveryRates = generateRecoveryRates()
  const scenarios: AuctionScenario[] = recoveryRates.map((rate, index) => {
    const grossRevenue = monthlyMSRP * rate
    const opsFee = grossRevenue * OPS_FEE_RATE
    const netProfit = grossRevenue - opsFee - estimatedCOGS
    const samShare = netProfit / 2
    const connorShare = netProfit / 2
    const roi = estimatedCOGS > 0 ? netProfit / estimatedCOGS : 0

    return {
      id: (index + 1).toString(),
      scenario: `${(rate * 100).toFixed(0)}% of MSRP`,
      recoveryRate: rate,
      grossRevenue,
      opsFee,
      cogs: estimatedCOGS,
      netProfit,
      samShare,
      connorShare,
      roi,
    }
  })

  const breakEvenRevenue = estimatedCOGS / 0.70
  const breakEvenRate = monthlyMSRP > 0 ? breakEvenRevenue / monthlyMSRP : 0

  // Economic analysis curve data
  const marginalCurveData = []
  for (let i = 0; i <= 40; i++) {
    const rate = i / 100
    const revenue = monthlyMSRP * rate
    const opsFee = revenue * OPS_FEE_RATE
    const totalCost = estimatedCOGS + opsFee
    const profit = revenue - totalCost
    marginalCurveData.push({
      rate: i,
      rateLabel: `${i}%`,
      totalRevenue: revenue,
      totalCost: totalCost,
      opsFee: opsFee,
      cogs: estimatedCOGS,
      profit: profit,
    })
  }

  const curveData = scenarios.map(s => ({
    opsFee: s.opsFee,
    rate: `${(s.recoveryRate * 100).toFixed(0)}%`,
    rateNum: s.recoveryRate * 100,
    grossRevenue: s.grossRevenue,
    netRevenue: s.grossRevenue - s.opsFee,
    cogs: estimatedCOGS,
    profit: s.netProfit,
    roi: s.roi * 100,
  }))

  const keyScenarios = scenarios.slice(0, Math.min(5, scenarios.length))

  const weeklyColumns: Column<WeeklyScenario>[] = [
    {
      key: "weeklyMSRP",
      header: "Weekly MSRP",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right font-medium",
    },
    {
      key: "monthlyMSRP",
      header: "Monthly MSRP",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "estimatedCOGS",
      header: "Est. COGS",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right text-muted-foreground",
    },
    {
      key: "netProfitAt18",
      header: "Net Profit @ 18%",
      render: (value) => {
        const profit = value as number
        return (
          <span className={profit >= 0 ? "text-primary" : "text-destructive"}>
            {formatCurrency(profit)}
          </span>
        )
      },
      className: "font-mono text-right",
    },
    {
      key: "netProfitAt20",
      header: "Net Profit @ 20%",
      render: (value) => {
        const profit = value as number
        return (
          <span className={profit >= 0 ? "text-primary" : "text-destructive"}>
            {formatCurrency(profit)}
          </span>
        )
      },
      className: "font-mono text-right",
    },
    {
      key: "netProfitAt25",
      header: "Net Profit @ 25%",
      render: (value) => {
        const profit = value as number
        return (
          <span className={profit >= 0 ? "text-primary" : "text-destructive"}>
            {formatCurrency(profit)}
          </span>
        )
      },
      className: "font-mono text-right",
    },
  ]

  const columns: Column<AuctionScenario>[] = [
    { key: "scenario", header: "Scenario", className: "font-medium" },
    {
      key: "grossRevenue",
      header: "Gross Revenue",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "opsFee",
      header: "Ops Fee (30%)",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right text-muted-foreground",
    },
    {
      key: "netProfit",
      header: "Net Profit",
      render: (value) => {
        const profit = value as number
        return (
          <span className={profit >= 0 ? "text-primary" : "text-destructive"}>
            {formatCurrency(profit)}
          </span>
        )
      },
      className: "font-mono text-right",
    },
    {
      key: "samShare",
      header: "Sam (50%)",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "connorShare",
      header: "Connor (50%)",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "roi",
      header: "ROI",
      render: (value) => {
        const roi = value as number
        return (
          <span className={roi >= 0 ? "text-primary" : "text-destructive"}>
            {formatPercent(roi)}
          </span>
        )
      },
      className: "font-mono text-right",
    },
  ]

  // Custom tooltip for Marginal Revenue Curve chart
  const MarginalCurveTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0]?.payload
    if (!data) return null
    
    return (
      <div style={{
        backgroundColor: "oklch(0.18 0.02 260)",
        border: "1px solid oklch(0.25 0.02 260)",
        borderRadius: "8px",
        padding: "12px 16px",
        color: "oklch(0.95 0.01 260)",
        minWidth: "220px"
      }}>
        <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
          Recovery Rate: {data.rate}
        </p>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <p style={{ color: "oklch(0.72 0.15 185)" }}>
            Gross Revenue: <span style={{ float: "right", fontFamily: "monospace" }}>{formatCurrency(data.grossRevenue)}</span>
          </p>
          <p style={{ color: "oklch(0.65 0.18 40)" }}>
            − Ops Fee (30%): <span style={{ float: "right", fontFamily: "monospace" }}>{formatCurrency(data.opsFee)}</span>
          </p>
          <hr style={{ border: "none", borderTop: "1px solid oklch(0.35 0.02 260)", margin: "6px 0" }} />
          <p style={{ color: "oklch(0.70 0.18 160)", fontWeight: 600 }}>
            Net Revenue: <span style={{ float: "right", fontFamily: "monospace" }}>{formatCurrency(data.netRevenue)}</span>
          </p>
          <p style={{ color: "oklch(0.55 0.15 30)" }}>
            − COGS: <span style={{ float: "right", fontFamily: "monospace" }}>{formatCurrency(data.cogs)}</span>
          </p>
          <hr style={{ border: "none", borderTop: "1px solid oklch(0.35 0.02 260)", margin: "6px 0" }} />
          <p style={{ 
            fontWeight: 600, 
            color: data.profit >= 0 ? "oklch(0.70 0.18 160)" : "oklch(0.65 0.20 30)",
            fontSize: 14
          }}>
            = Net Profit: <span style={{ float: "right", fontFamily: "monospace" }}>{formatCurrency(data.profit)}</span>
          </p>
        </div>
      </div>
    )
  }

  // Custom tooltip for economic analysis chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0]?.payload
    if (!data) return null
    
    return (
      <div style={{
        backgroundColor: "oklch(0.18 0.02 260)",
        border: "1px solid oklch(0.25 0.02 260)",
        borderRadius: "8px",
        padding: "12px 16px",
        color: "oklch(0.95 0.01 260)",
        minWidth: "220px"
      }}>
        <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
          Recovery Rate: {Math.round(data.rate)}%
        </p>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <p style={{ color: "oklch(0.72 0.15 185)" }}>
            Gross Revenue: <span style={{ float: "right", fontFamily: "monospace" }}>{formatCurrency(data.totalRevenue)}</span>
          </p>
          <p style={{ color: "oklch(0.65 0.18 40)" }}>
            − Ops Fee (30%): <span style={{ float: "right", fontFamily: "monospace" }}>{formatCurrency(data.opsFee)}</span>
          </p>
          <p style={{ color: "oklch(0.55 0.15 30)" }}>
            − COGS: <span style={{ float: "right", fontFamily: "monospace" }}>{formatCurrency(data.cogs)}</span>
          </p>
          <hr style={{ border: "none", borderTop: "1px solid oklch(0.35 0.02 260)", margin: "8px 0" }} />
          <p style={{ 
            fontWeight: 600, 
            color: data.profit >= 0 ? "oklch(0.70 0.18 160)" : "oklch(0.65 0.20 30)",
            fontSize: 14
          }}>
            = Net Profit: <span style={{ float: "right", fontFamily: "monospace" }}>{formatCurrency(data.profit)}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auction Projections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Model auction scenarios with 30% ops fee and 50/50 profit split
        </p>
      </div>

      {/* Auction Summary Banner */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Monthly MSRP</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyMSRP)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Est. COGS ({formatPercent(avgCogsPercent)})</p>
              <p className="text-2xl font-bold text-destructive">-{formatCurrency(estimatedCOGS)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Ops Fee (30%)</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyMSRP * 0.20 * 0.30)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Net @ 20%</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency((monthlyMSRP * 0.20 * 0.70) - estimatedCOGS)}</p>
            </div>
            <div className="text-center border-l-2 border-primary pl-6">
              <p className="text-sm text-muted-foreground mb-1">YOUR SHARE (50%)</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(((monthlyMSRP * 0.20 * 0.70) - estimatedCOGS) / 2)}</p>
              <p className="text-xs text-muted-foreground mt-1">@ 20% recovery</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Current Total MSRP" value={formatCurrency(totalMSRP)} icon={DollarSign} />
        <KPICard title="Current COGS" value={formatCurrency(totalCOGS)} icon={TrendingUp} />
        <KPICard title="Avg COGS % of MSRP" value={formatPercent(avgCogsPercent)} icon={Gavel} />
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <Label htmlFor="weekly-msrp" className="text-sm text-muted-foreground">Weekly MSRP Target</Label>
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

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">Recovery Rate Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {scenarios.length} scenarios from {minRecoveryRate}% to {maxRecoveryRate}% in {rateStep}% increments
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Economic Analysis: Total Revenue vs Total Cost (incl. 30% Ops)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={marginalCurveData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <defs>
                  <linearGradient id="profitZone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.70 0.18 160)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="oklch(0.70 0.18 160)" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="lossZone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.20 30)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="oklch(0.65 0.20 30)" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="targetZone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.75 0.16 85)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="oklch(0.75 0.16 85)" stopOpacity={0.15}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis
                  dataKey="rate"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  tickFormatter={(value) => `${Math.round(value)}%`}
                  label={{ value: "Recovery Rate (%)", position: "insideBottom", offset: -10, style: { fill: "oklch(0.65 0.01 260)", fontSize: 14, fontWeight: 600 } }}
                />
                <YAxis
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  label={{ value: "Dollar Amount ($)", angle: -90, position: "insideLeft", style: { fill: "oklch(0.65 0.01 260)", fontSize: 14, fontWeight: 600 } }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "oklch(0.65 0.01 260)", strokeWidth: 1, strokeDasharray: "5 5" }} />
                <Legend verticalAlign="top" height={36} iconType="line" />
                
                <ReferenceLine x={breakEvenRate * 100} stroke="oklch(0.75 0.16 85)" strokeWidth={2} strokeDasharray="8 4" label={{ value: `Break-Even: ${(breakEvenRate * 100).toFixed(1)}%`, fill: "oklch(0.75 0.16 85)", fontSize: 12, fontWeight: 600, position: "top" }} />
                
                <ReferenceArea x1={breakEvenRate * 100} x2={40} fill="url(#profitZone)" fillOpacity={0.3} label={{ value: "Profit Zone", fill: "oklch(0.70 0.18 160)", fontSize: 11, position: "insideTopRight" }} />
                <ReferenceArea x1={0} x2={breakEvenRate * 100} fill="url(#lossZone)" fillOpacity={0.3} label={{ value: "Loss Zone", fill: "oklch(0.65 0.20 30)", fontSize: 11, position: "insideTopLeft" }} />
                <ReferenceArea x1={20} x2={25} fill="url(#targetZone)" fillOpacity={0.5} label={{ value: "Target Zone", fill: "oklch(0.75 0.16 85)", fontSize: 12, fontWeight: 700, position: "insideTop" }} />
                
                <ReferenceLine x={20} stroke="oklch(0.75 0.16 85)" strokeWidth={2} strokeDasharray="6 4" />
                <ReferenceLine x={25} stroke="oklch(0.75 0.16 85)" strokeWidth={2} strokeDasharray="6 4" />
                
                <Line type="monotone" dataKey="totalRevenue" stroke="oklch(0.72 0.15 185)" strokeWidth={3} dot={false} name="Total Revenue (TR)" />
                <Line type="monotone" dataKey="cogs" stroke="oklch(0.55 0.12 30)" strokeWidth={2} dot={false} name="COGS" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="profit" stroke="oklch(0.70 0.18 160)" fill="oklch(0.70 0.18 160)" fillOpacity={0.4} strokeWidth={2} name="Profit" dot={false} />
                <Line type="monotone" dataKey="totalCost" stroke="oklch(0.65 0.20 30)" strokeWidth={3} dot={false} name="Total Cost (TC)" strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Economic Interpretation (with 30% Ops Fee):</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Total Revenue (TR)</strong>: Linear function increasing with recovery rate</li>
              <li><strong>Total Cost (TC)</strong>: COGS + 30% Ops Fee (slopes upward because ops is variable)</li>
              <li><strong>COGS</strong>: Fixed sourcing cost regardless of recovery rate</li>
              <li><strong>Break-Even</strong>: Where TR = TC ({formatPercent(breakEvenRate)} = {formatCurrency(breakEvenRevenue)})</li>
              <li><strong>Key Insight</strong>: Because Ops is 30% of revenue, you keep only 70 cents per dollar after ops</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">Marginal Revenue Curve with Break-Even</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curveData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorGrossRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNetRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.70 0.18 160)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.70 0.18 160)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis dataKey="rate" stroke="oklch(0.65 0.01 260)" fontSize={12} label={{ value: "Recovery Rate", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="oklch(0.65 0.01 260)" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip content={<MarginalCurveTooltip />} />
                <Legend />
                <ReferenceLine y={estimatedCOGS} stroke="oklch(0.65 0.20 30)" strokeDasharray="3 3" label={{ value: "COGS", fill: "oklch(0.65 0.20 30)" }} />
                <ReferenceLine x={`${(breakEvenRate * 100).toFixed(0)}%`} stroke="oklch(0.75 0.16 85)" strokeDasharray="3 3" label={{ value: "Break-Even", fill: "oklch(0.75 0.16 85)", position: "top" }} />
                <Area type="monotone" dataKey="grossRevenue" stroke="oklch(0.72 0.15 185)" fill="url(#colorGrossRevenue)" name="Gross Revenue" strokeWidth={2} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="netRevenue" stroke="oklch(0.70 0.18 160)" fill="url(#colorNetRevenue)" name="Net Revenue (after ops)" strokeWidth={2} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="cogs" stroke="oklch(0.65 0.20 30)" fill="none" name="COGS" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-card-foreground">Net Profit vs Recovery Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={curveData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                  <XAxis dataKey="rate" stroke="oklch(0.65 0.01 260)" fontSize={12} />
                  <YAxis stroke="oklch(0.65 0.01 260)" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<MarginalCurveTooltip />} />
                  <Bar dataKey="profit" fill="oklch(0.70 0.18 160)" name="Net Profit" radius={[4, 4, 0, 0]} />
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
                  <YAxis stroke="oklch(0.65 0.01 260)" fontSize={12} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} contentStyle={{ backgroundColor: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.25 0.02 260)", borderRadius: "8px", color: "oklch(0.95 0.01 260)" }} />
                  <Line type="monotone" dataKey="roi" stroke="oklch(0.72 0.15 185)" strokeWidth={2} dot={{ fill: "oklch(0.72 0.15 185)", strokeWidth: 0, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} name="ROI %" />
                  <ReferenceLine y={0} stroke="oklch(0.25 0.02 260)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-card-foreground">Break-Even Analysis (Monthly: {formatCurrency(monthlyMSRP)})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Break-Even Recovery Rate</p>
              <p className="text-2xl font-bold text-primary">{formatPercent(breakEvenRate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Break-Even Gross Revenue</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(breakEvenRevenue)}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            With 30% ops fee, you need to recover at least {formatPercent(breakEvenRate)} of MSRP ({formatCurrency(breakEvenRevenue)}) to break even on estimated monthly COGS of {formatCurrency(estimatedCOGS)}.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-foreground">Weekly Sourcing Scenarios</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={weeklyColumns} data={weeklyScenarios} getRowClassName={(row) => row.weeklyMSRP === weeklyMSRP ? "bg-primary/15 border-l-2 border-l-primary" : ""} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-foreground">Key Recovery Scenarios (Monthly: {formatCurrency(monthlyMSRP)})</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={keyScenarios} getRowClassName={(row) => (row.recoveryRate >= 0.20 && row.recoveryRate <= 0.25) ? "bg-primary/15 border-l-2 border-l-primary" : ""} />
        </CardContent>
      </Card>
    </div>
  )
}
