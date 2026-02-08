"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/kpi-card"
import { DataTable, type Column } from "@/components/data-table"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"
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

interface RecoveryScenario {
  id: string
  scenario: string
  recoveryRate: number
  expectedRevenue: number
  grossProfit: number
  roi: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

export function ProjectionsContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
        <p className="text-muted-foreground">Loading projections...</p>
      </div>
    )
  }

  // Calculate actual metrics
  const totalMSRP = orders.reduce((sum, order) => sum + order.totalMSRP, 0)
  const totalAllIn = orders.reduce((sum, order) => sum + order.totalAllIn, 0)
  const avgCogsPercent = totalMSRP > 0 ? totalAllIn / totalMSRP : 0

  // Recovery scenarios
  const recoveryRates = [0.05, 0.10, 0.15, 0.18, 0.20, 0.25, 0.30, 0.35, 0.40]
  const scenarios: RecoveryScenario[] = recoveryRates.map((rate, index) => {
    const expectedRevenue = totalMSRP * rate
    const grossProfit = expectedRevenue - totalAllIn
    const roi = totalAllIn > 0 ? grossProfit / totalAllIn : 0

    return {
      id: (index + 1).toString(),
      scenario: `${(rate * 100).toFixed(0)}% of MSRP`,
      recoveryRate: rate,
      expectedRevenue,
      grossProfit,
      roi,
    }
  })

  // Find break-even point
  const breakEvenRate = avgCogsPercent
  const breakEvenRevenue = totalMSRP * breakEvenRate

  // Chart data for revenue curve
  const chartData = scenarios.map(s => ({
    rate: `${(s.recoveryRate * 100).toFixed(0)}%`,
    rateNum: s.recoveryRate * 100,
    revenue: s.expectedRevenue,
    cogs: totalAllIn,
    profit: s.grossProfit,
    roi: s.roi * 100,
  }))

  // Key scenarios for table
  const keyScenarios = scenarios.filter(s =>
    [0.15, 0.18, 0.20, 0.25, 0.30].includes(s.recoveryRate)
  )

  const columns: Column<RecoveryScenario>[] = [
    { key: "scenario", header: "Scenario", className: "font-medium" },
    {
      key: "recoveryRate",
      header: "Recovery Rate",
      render: (value) => formatPercent(value as number),
      className: "font-mono text-right",
    },
    {
      key: "expectedRevenue",
      header: "Expected Revenue",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "grossProfit",
      header: "Gross Profit",
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
        <h1 className="text-2xl font-bold text-foreground">Financial Projections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recovery scenarios and ROI analysis based on actual COGS data
        </p>
      </div>

      
      {/* Projections Summary Banner */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total MSRP</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMSRP)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total COGS</p>
              <p className="text-2xl font-bold text-destructive">-{formatCurrency(totalAllIn)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Break-Even Rate</p>
              <p className="text-2xl font-bold text-foreground">{formatPercent(avgCogsPercent)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Profit @ 20%</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency((totalMSRP * 0.20) - totalAllIn)}</p>
            </div>
            <div className="text-center border-l-2 border-primary pl-6">
              <p className="text-sm text-muted-foreground mb-1">PROFIT @ 25%</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency((totalMSRP * 0.25) - totalAllIn)}</p>
              <p className="text-xs text-muted-foreground mt-1">target recovery</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <KPICard
          title="Total MSRP"
          value={formatCurrency(totalMSRP)}
          icon={DollarSign}
        />
        <KPICard
          title="Total All-in (COGS)"
          value={formatCurrency(totalAllIn)}
          icon={TrendingDown}
        />
        <KPICard
          title="Avg COGS % of MSRP"
          value={formatPercent(avgCogsPercent)}
          icon={TrendingUp}
        />
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Revenue Curve with Break-Even Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                <XAxis
                  dataKey="rate"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  label={{ value: 'Recovery Rate', position: 'insideBottom', offset: -5 }}
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
                  }}
                />
                <Legend />
                <ReferenceLine
                  y={totalAllIn}
                  stroke="oklch(0.65 0.20 30)"
                  strokeDasharray="3 3"
                  label={{ value: 'COGS', fill: 'oklch(0.65 0.20 30)' }}
                />
                <ReferenceLine
                  x={`${(breakEvenRate * 100).toFixed(0)}%`}
                  stroke="oklch(0.72 0.15 185)"
                  strokeDasharray="3 3"
                  label={{ value: 'Break-Even', fill: 'oklch(0.72 0.15 185)', position: 'top' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.72 0.15 185)"
                  fill="url(#colorRevenue)"
                  name="Expected Revenue"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="cogs"
                  stroke="oklch(0.65 0.20 30)"
                  fill="none"
                  name="COGS"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Profit vs Recovery Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                <XAxis dataKey="rate" stroke="oklch(0.65 0.01 260)" fontSize={12} />
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
                  }}
                />
                <Bar
                  dataKey="profit"
                  fill="oklch(0.70 0.18 160)"
                  name="Gross Profit"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              Break-Even Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              You need to recover at least {formatPercent(breakEvenRate)} of MSRP to break even on your total investment of {formatCurrency(totalAllIn)}.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              ROI by Recovery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                  <XAxis dataKey="rate" stroke="oklch(0.65 0.01 260)" fontSize={12} />
                  <YAxis
                    stroke="oklch(0.65 0.01 260)"
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value: any) => `${value.toFixed(1)}%`}
                    contentStyle={{
                      backgroundColor: "oklch(0.18 0.02 260)",
                      border: "1px solid oklch(0.25 0.02 260)",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="roi"
                    stroke="oklch(0.72 0.15 185)"
                    strokeWidth={2}
                    dot={{ fill: 'oklch(0.72 0.15 185)', strokeWidth: 0, r: 4 }}
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
            Key Recovery Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={keyScenarios} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              Conservative Scenario (15%)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Revenue</span>
              <span className="font-mono text-foreground">{formatCurrency(keyScenarios[0].expectedRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Profit</span>
              <span className={`font-mono ${keyScenarios[0].grossProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(keyScenarios[0].grossProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROI</span>
              <span className={`font-mono ${keyScenarios[0].roi >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(keyScenarios[0].roi)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              Target Scenario (20%)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Revenue</span>
              <span className="font-mono text-foreground">{formatCurrency(keyScenarios[2].expectedRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Profit</span>
              <span className={`font-mono ${keyScenarios[2].grossProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(keyScenarios[2].grossProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROI</span>
              <span className={`font-mono ${keyScenarios[2].roi >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(keyScenarios[2].roi)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
