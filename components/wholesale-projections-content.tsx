"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/kpi-card"
import { DataTable, type Column } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUp, DollarSign, Package, Percent } from "lucide-react"
import { ProjectionsSkeleton } from "@/components/skeletons"
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
  Customized,
  Cross,
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

interface WholesaleScenario {
  id: string
  scenario: string
  recoveryRate: number
  grossRevenue: number
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
  netProfitAt10: number
  netProfitAt12: number
  netProfitAt15: number
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

export function WholesaleProjectionsContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [weeklyMSRP, setWeeklyMSRP] = useState(500000)
  const [minRecoveryRate, setMinRecoveryRate] = useState(15)
  const [maxRecoveryRate, setMaxRecoveryRate] = useState(40)
  const [rateStep, setRateStep] = useState(5)

  useEffect(() => {
    // Load settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings)
          setWeeklyMSRP(data.settings.defaultWeeklyMSRP || 500000)
          setMinRecoveryRate(data.settings.wholesaleRecoveryRate || 15)
        }
      })
      .catch((err) => console.error("Failed to load settings:", err))

    // Load orders
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
    return <ProjectionsSkeleton />
  }

  // Calculate actual metrics from current data
  const totalMSRP = orders.reduce((sum, order) => sum + order.totalMSRP, 0)
  const totalCOGS = orders.reduce((sum, order) => sum + order.totalAllIn, 0)
  const avgCogsPercent = totalMSRP > 0 ? totalCOGS / totalMSRP : 0.048

  // Weekly sourcing scenarios - dynamically generated around selected weekly MSRP
  const generateWeeklyScenarios = () => {
    const scenarios = []
    const target = weeklyMSRP

    // Generate scenarios: 50%, 75%, 100%, 125%, 150% of target
    const multipliers = [0.5, 0.75, 1.0, 1.25, 1.5]

    for (const multiplier of multipliers) {
      const weekly = Math.round(target * multiplier / 5000) * 5000 // Round to nearest 5k
      const monthly = weekly * 4
      const estimatedCOGS = monthly * avgCogsPercent

      const calcNetProfit = (rate: number) => {
        const grossRev = monthly * rate
        return grossRev - estimatedCOGS
      }

      scenarios.push({
        weeklyMSRP: weekly,
        monthlyMSRP: monthly,
        estimatedCOGS,
        netProfitAt10: calcNetProfit(0.10),
        netProfitAt12: calcNetProfit(0.12),
        netProfitAt15: calcNetProfit(0.15),
        netProfitAt18: calcNetProfit(0.18),
        netProfitAt20: calcNetProfit(0.20),
        netProfitAt25: calcNetProfit(0.25),
      })
    }

    return scenarios
  }

  const weeklyScenarios: WeeklyScenario[] = generateWeeklyScenarios()

  // Chart data for weekly scenarios visualization
  const weeklyScenariosChartData = weeklyScenarios.map(s => ({
    weekly: `$${(s.weeklyMSRP / 1000).toFixed(0)}k`,
    weeklyMSRP: s.weeklyMSRP,
    profit10: s.netProfitAt10,
    profit12: s.netProfitAt12,
    profit15: s.netProfitAt15,
    profit18: s.netProfitAt18,
    profit20: s.netProfitAt20,
    profit25: s.netProfitAt25,
  }))

  // Recovery scenarios for selected weekly MSRP
  const monthlyMSRP = weeklyMSRP * 4
  const estimatedCOGS = monthlyMSRP * avgCogsPercent

  // Generate recovery rates dynamically based on user inputs
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
  const scenarios: WholesaleScenario[] = recoveryRates.map((rate, index) => {
    const grossRevenue = monthlyMSRP * rate
    const netProfit = grossRevenue - estimatedCOGS
    const samShare = netProfit / 2
    const connorShare = netProfit / 2
    const roi = estimatedCOGS > 0 ? netProfit / estimatedCOGS : 0

    return {
      id: (index + 1).toString(),
      scenario: `${(rate * 100).toFixed(0)}% of MSRP`,
      recoveryRate: rate,
      grossRevenue,
      cogs: estimatedCOGS,
      netProfit,
      samShare,
      connorShare,
      roi,
    }
  })

  // Find break-even point (no ops fee for wholesale)
  const breakEvenRate = avgCogsPercent
  const breakEvenRevenue = monthlyMSRP * breakEvenRate

  // Marginal revenue curve data - more granular for smooth curves
  const marginalCurveData = []
  for (let i = 0; i <= 30; i++) {
    const rate = i / 100; const revenue = monthlyMSRP * rate
    const profit = revenue - estimatedCOGS
    marginalCurveData.push({
      rate: i,
      rateLabel: `${i}%`,
      totalRevenue: revenue,
      totalCost: estimatedCOGS,
      profit: profit,
    })
  }

  // Key scenarios for table - use first 5 scenarios
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
      key: "netProfitAt10",
      header: "Net Profit @ 10%",
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
      key: "netProfitAt12",
      header: "Net Profit @ 12%",
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
      key: "netProfitAt15",
      header: "Net Profit @ 15%",
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

  const columns: Column<WholesaleScenario>[] = [
    { key: "scenario", header: "Scenario", className: "font-medium" },
    {
      key: "grossRevenue",
      header: "Gross Revenue",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wholesale Projections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Model wholesale scenarios with no ops fee and 50/50 profit split
        </p>
      </div>

      {/* Wholesale Summary Banner */}
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
              <p className="text-sm text-muted-foreground mb-1">Revenue @ 22%</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyMSRP * 0.22)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency((monthlyMSRP * 0.22) - estimatedCOGS)}</p>
            </div>
            <div className="text-center border-l-2 border-primary pl-6">
              <p className="text-sm text-muted-foreground mb-1">YOUR SHARE (50%)</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(((monthlyMSRP * 0.22) - estimatedCOGS) / 2)}</p>
              <p className="text-xs text-muted-foreground mt-1">@ 22% recovery</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          title="Avg COGS % of MSRP"
          value={formatPercent(avgCogsPercent)}
          icon={Package}
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

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Recovery Rate Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="min-rate" className="text-sm text-muted-foreground">
                Min Recovery Rate (%)
              </Label>
              <Input
                id="min-rate"
                type="number"
                value={minRecoveryRate}
                onChange={(e) => setMinRecoveryRate(Number(e.target.value))}
                className="mt-2 font-mono"
                min={1}
                max={100}
              />
            </div>
            <div>
              <Label htmlFor="max-rate" className="text-sm text-muted-foreground">
                Max Recovery Rate (%)
              </Label>
              <Input
                id="max-rate"
                type="number"
                value={maxRecoveryRate}
                onChange={(e) => setMaxRecoveryRate(Number(e.target.value))}
                className="mt-2 font-mono"
                min={1}
                max={100}
              />
            </div>
            <div>
              <Label htmlFor="rate-step" className="text-sm text-muted-foreground">
                Step Size (%)
              </Label>
              <Input
                id="rate-step"
                type="number"
                value={rateStep}
                onChange={(e) => setRateStep(Number(e.target.value))}
                className="mt-2 font-mono"
                min={1}
                max={20}
              />
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
            Weekly Sourcing Scenarios - Profit by Recovery Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyScenariosChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" vertical={true} horizontal={true} />
                <XAxis
                  dataKey="weekly"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  label={{ value: "Weekly MSRP", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.25 0.02 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.01 260)"
                  }}
                  labelStyle={{ color: "oklch(0.95 0.01 260)" }}
                  itemStyle={{ color: "oklch(0.85 0.01 260)" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="profit10"
                  stroke="oklch(0.50 0.15 30)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.50 0.15 30)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Net Profit @ 10%"
                />
                <Line
                  type="monotone"
                  dataKey="profit12"
                  stroke="oklch(0.60 0.18 40)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.60 0.18 40)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Net Profit @ 12%"
                />
                <Line
                  type="monotone"
                  dataKey="profit15"
                  stroke="oklch(0.65 0.20 30)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.65 0.20 30)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Net Profit @ 15%"
                />
                <Line
                  type="monotone"
                  dataKey="profit18"
                  stroke="oklch(0.75 0.16 85)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.75 0.16 85)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Net Profit @ 18%"
                />
                <Line
                  type="monotone"
                  dataKey="profit20"
                  stroke="oklch(0.72 0.15 185)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.72 0.15 185)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Net Profit @ 20%"
                />
                <Line
                  type="monotone"
                  dataKey="profit25"
                  stroke="oklch(0.70 0.18 160)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.70 0.18 160)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Net Profit @ 25%"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Economic Analysis: Total Revenue vs Total Cost
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
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" vertical={true} horizontal={true} />
                <XAxis
                  dataKey="rate"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  label={{ 
                    value: "Recovery Rate (%)", 
                    position: "insideBottom", 
                    offset: -10,
                    style: { fill: "oklch(0.65 0.01 260)", fontSize: 14, fontWeight: 600 }
                  }}
                  ticks={[0, 5, 10, 15, 20, 25, 30]}
                  tickFormatter={(value) => `${Math.round(value)}%`}
                />
                <YAxis
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  label={{ 
                    value: "Dollar Amount ($)", 
                    angle: -90, 
                    position: "insideLeft",
                    style: { fill: "oklch(0.65 0.01 260)", fontSize: 14, fontWeight: 600 }
                  }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === "Total Revenue (TR)") return [formatCurrency(value), "Total Revenue"]
                    if (name === "Total Cost (TC)") return [formatCurrency(value), "Total Cost (COGS)"]
                    if (name === "Profit") return [formatCurrency(value), "Net Profit"]
                    return [formatCurrency(value), name]
                  }}
                  labelFormatter={(label) => `Recovery Rate: ${Math.round(label)}%`}
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.25 0.02 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.01 260)"
                  }}
                  labelStyle={{ color: "oklch(0.95 0.01 260)", fontWeight: 600 }}
                  itemStyle={{ color: "oklch(0.85 0.01 260)" }}
                  cursor={{ stroke: "oklch(0.65 0.01 260)", strokeWidth: 1, strokeDasharray: "5 5" }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="line"
                />
                
                {/* Break-even vertical line */}
                <ReferenceLine
                  x={breakEvenRate * 100}
                  stroke="oklch(0.75 0.16 85)"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  label={{ 
                    value: `Break-Even Point: ${(breakEvenRate * 100).toFixed(1)}%`, 
                    fill: "oklch(0.75 0.16 85)",
                    fontSize: 12,
                    fontWeight: 600,
                    position: "top"
                  }}
                />
                
                {/* Profit zone shading */}
                <ReferenceArea
                  x1={breakEvenRate * 100}
                  x2={30}
                  fill="url(#profitZone)"
                  fillOpacity={0.3}
                  label={{ 
                    value: "Profit Zone", 
                    fill: "oklch(0.70 0.18 160)",
                    fontSize: 11,
                    position: "insideTopRight"
                  }}
                />
                
                {/* Loss zone shading */}
                <ReferenceArea
                  x1={0}
                  x2={breakEvenRate * 100}
                  fill="url(#lossZone)"
                  fillOpacity={0.3}
                  label={{ 
                    value: "Loss Zone", 
                    fill: "oklch(0.65 0.20 30)",
                    fontSize: 11,
                    position: "insideTopLeft"
                  }}
                />
                
                {/* Target wholesale zone (15-18%) */}
                <ReferenceArea
                  x1={15}
                  x2={18}
                  fill="url(#targetZone)"
                  fillOpacity={0.5}
                  label={{ 
                    value: "Target Zone", 
                    fill: "oklch(0.75 0.16 85)",
                    fontSize: 12,
                    fontWeight: 700,
                    position: "insideTop"
                  }}
                />
                
                {/* Target range lines */}
                <ReferenceLine
                  x={15}
                  stroke="oklch(0.75 0.16 85)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                <ReferenceLine
                  x={18}
                  stroke="oklch(0.75 0.16 85)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                
                {/* Total Revenue (linear upward slope) */}
                <Line
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="oklch(0.72 0.15 185)"
                  strokeWidth={3}
                  dot={false}
                  name="Total Revenue (TR)"
                />
                
                {/* Profit area */}
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="oklch(0.70 0.18 160)"
                  fill="oklch(0.70 0.18 160)"
                  fillOpacity={0.4}
                  strokeWidth={2}
                  name="Profit"
                  dot={false}
                />
                
                {/* Total Cost (horizontal line) - rendered last to be on top */}
                <Line
                  type="monotone"
                  dataKey="totalCost"
                  stroke="oklch(0.65 0.20 30)"
                  strokeWidth={3}
                  dot={false}
                  name="Total Cost (TC)"
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Economic Interpretation:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Total Revenue (TR)</strong>: Linear function increasing with recovery rate (price × quantity)</li>
              <li><strong>Total Cost (TC)</strong>: Fixed COGS regardless of recovery rate (sourcing cost)</li>
              <li><strong>Break-Even Point</strong>: Where TR = TC ({formatPercent(breakEvenRate)} recovery rate = {formatCurrency(breakEvenRevenue)})</li>
              <li><strong>Profit Zone</strong>: Recovery rates above break-even generate positive profit (TR &gt; TC)</li>
              <li><strong>Loss Zone</strong>: Recovery rates below break-even generate losses (TR &lt; TC)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              Profit vs Recovery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginalCurveData.filter((d, i) => i % 3 === 0)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" vertical={true} horizontal={true} />
                  <XAxis 
                    dataKey="rate" 
                    stroke="oklch(0.65 0.01 260)" 
                    fontSize={12}
                    ticks={[0, 5, 10, 15, 20, 25, 30]}
                  tickFormatter={(value) => `${Math.round(value)}%`}
                  />
                  <YAxis
                    stroke="oklch(0.65 0.01 260)"
                    fontSize={12}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    labelFormatter={(label) => `${label}% Recovery`}
                    contentStyle={{
                      backgroundColor: "oklch(0.18 0.02 260)",
                      border: "1px solid oklch(0.25 0.02 260)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0.01 260)"
                    }}
                    labelStyle={{ color: "oklch(0.95 0.01 260)" }}
                    itemStyle={{ color: "oklch(0.85 0.01 260)" }}
                  />
                  <ReferenceLine
                    x={breakEvenRate * 100}
                    stroke="oklch(0.75 0.16 85)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Bar
                    dataKey="profit"
                    fill="oklch(0.70 0.18 160)"
                    name="Net Profit"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              ROI by Recovery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marginalCurveData.filter((d, i) => i % 2 === 0)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" vertical={true} horizontal={true} />
                  <XAxis 
                    dataKey="rate" 
                    stroke="oklch(0.65 0.01 260)" 
                    fontSize={12}
                    ticks={[0, 5, 10, 15, 20, 25, 30]}
                  tickFormatter={(value) => `${Math.round(value)}%`}
                  />
                  <YAxis
                    stroke="oklch(0.65 0.01 260)"
                    fontSize={12}
                    ticks={[0, 5, 10, 15, 20, 25, 30]}
                  tickFormatter={(value) => `${Math.round(value)}%`}
                  />
                  <Tooltip
                    formatter={(value: any) => `${value.toFixed(1)}%`}
                    labelFormatter={(label) => `${label}% Recovery`}
                    contentStyle={{
                      backgroundColor: "oklch(0.18 0.02 260)",
                      border: "1px solid oklch(0.25 0.02 260)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0.01 260)"
                    }}
                    labelStyle={{ color: "oklch(0.95 0.01 260)" }}
                    itemStyle={{ color: "oklch(0.85 0.01 260)" }}
                  />
                  <ReferenceLine
                    x={breakEvenRate * 100}
                    stroke="oklch(0.75 0.16 85)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey={(d) => ((d.profit / estimatedCOGS) * 100)}
                    stroke="oklch(0.72 0.15 185)"
                    strokeWidth={2}
                    dot={{ fill: "oklch(0.72 0.15 185)", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="ROI %"
                  />
                  <ReferenceLine y={0} stroke="oklch(0.25 0.02 260)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Break-Even Analysis (Monthly: {formatCurrency(monthlyMSRP)})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Break-Even Recovery Rate</p>
              <p className="text-2xl font-bold text-primary">{formatPercent(breakEvenRate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Break-Even Revenue</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(breakEvenRevenue)}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            With no ops fee, you need to recover at least {formatPercent(breakEvenRate)} of MSRP ({formatCurrency(breakEvenRevenue)}) to break even on estimated monthly COGS of {formatCurrency(estimatedCOGS)}.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Weekly Sourcing Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={weeklyColumns} data={weeklyScenarios} getRowClassName={(row) => row.weeklyMSRP === weeklyMSRP ? "bg-primary/15 border-l-2 border-l-primary" : ""} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Key Recovery Scenarios (Monthly: {formatCurrency(monthlyMSRP)})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={keyScenarios} getRowClassName={(row) => (row.recoveryRate >= 0.15 && row.recoveryRate <= 0.18) ? "bg-primary/15 border-l-2 border-l-primary" : ""} />
        </CardContent>
      </Card>
    </div>
  )
}
