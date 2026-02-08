"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/kpi-card"
import { DataTable, type Column } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUp, DollarSign, Package, Calendar, RefreshCw, Clock, Banknote } from "lucide-react"
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
  ComposedChart,
  Area,
  ReferenceLine,
  ReferenceArea,
} from "recharts"

interface WeeklySummary {
  id: string
  periodStart: string
  periodEnd: string
  totalOrders: number
  totalMSRP: number
  totalItems: number
  totalPallets: number
  totalAllIn: number
  allInPercentMSRP: number
  allInPerItem: number
}

interface WeeklyProfit {
  week: string
  recovery15: number
  recovery20: number
  recovery25: number
  recovery30: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatPercent = (value: number) => `${value.toFixed(1)}%`
const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value)
const formatDecimal = (value: number) => value.toFixed(2)

export function WeeklySummariesContent() {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([])
  const [loading, setLoading] = useState(true)
  
  // Cash cycle assumptions (user adjustable)
  const [cashCycleDays, setCashCycleDays] = useState(45) // Days from purchase to cash collection
  const [recoveryRate, setRecoveryRate] = useState(20) // Expected recovery rate %
  const [opsFeeRate, setOpsFeeRate] = useState(0)
  const [sourcingPercent, setSourcingPercent] = useState<number | null>(null) // null = use actual data // 0 for wholesale, 30 for auction

  useEffect(() => {
    fetch("/api/weekly-summaries")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.summaries) {
          setSummaries(data.summaries)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch weekly summaries:", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading weekly summaries...</p>
      </div>
    )
  }

  // Calculate totals and averages
  const totalMSRP = summaries.reduce((sum, s) => sum + s.totalMSRP, 0)
  const totalAllIn = summaries.reduce((sum, s) => sum + s.totalAllIn, 0)
  const totalItems = summaries.reduce((sum, s) => sum + s.totalItems, 0)
  const totalPallets = summaries.reduce((sum, s) => sum + s.totalPallets, 0)
  const totalWeeks = summaries.length

  // Calculate run rates (weekly averages)
  const avgWeeklyMSRP = totalWeeks > 0 ? totalMSRP / totalWeeks : 0
  const actualAvgWeeklyAllIn = totalWeeks > 0 ? totalAllIn / totalWeeks : 0
  // If sourcingPercent is set, calculate all-in from MSRP, otherwise use actual
  const avgWeeklyAllIn = sourcingPercent !== null ? avgWeeklyMSRP * (sourcingPercent / 100) : actualAvgWeeklyAllIn
  const effectiveSourcingPercent = avgWeeklyMSRP > 0 ? (avgWeeklyAllIn / avgWeeklyMSRP) * 100 : 0
  const avgWeeklyItems = totalWeeks > 0 ? totalItems / totalWeeks : 0
  const avgWeeklyPallets = totalWeeks > 0 ? totalPallets / totalWeeks : 0

  // Calculate monthly run rate (4.33 weeks per month)
  const monthlyMSRPRunRate = avgWeeklyMSRP * 4.33
  const monthlyAllInRunRate = avgWeeklyAllIn * 4.33

  // ============================================
  // CASH CYCLE & CAPITAL TURNOVER CALCULATIONS
  // ============================================
  
  // Cash cycle metrics
  const cashCycleWeeks = cashCycleDays / 7
  const cashTurnsPerMonth = 30 / cashCycleDays
  const cashTurnsPerYear = 365 / cashCycleDays
  
  // Capital required at steady state
  // During cash cycle, you need to fund multiple weeks of purchases
  const capitalRequired = avgWeeklyAllIn * cashCycleWeeks
  
  // Expected returns per cash turn
  const expectedRevenue = avgWeeklyMSRP * cashCycleWeeks * (recoveryRate / 100)
  const opsFee = expectedRevenue * (opsFeeRate / 100)
  const profitPerTurn = expectedRevenue - opsFee - capitalRequired
  const marginPerTurn = capitalRequired > 0 ? (profitPerTurn / capitalRequired) * 100 : 0
  
  // Annualized returns
  const annualProfit = profitPerTurn * cashTurnsPerYear
  const annualROC = capitalRequired > 0 ? (annualProfit / capitalRequired) * 100 : 0 // Return on Capital
  const monthlyROC = annualROC / 12
  
  // Break-even analysis for cash turns
  // Break-even recovery rate: (Capital) / (MSRP * (1 - opsFeeRate))
  const breakEvenRecoveryRate = capitalRequired / (avgWeeklyMSRP * cashCycleWeeks * (1 - opsFeeRate / 100)) * 100
  
  // Cash turn efficiency chart data - shows profit at different turn rates
  const cashTurnEfficiencyData = []
  for (let turns = 2; turns <= 12; turns++) {
    const daysPerTurn = 365 / turns
    const weeksPerTurn = daysPerTurn / 7
    const capitalNeeded = avgWeeklyAllIn * weeksPerTurn
    const revenue = avgWeeklyMSRP * weeksPerTurn * (recoveryRate / 100)
    const ops = revenue * (opsFeeRate / 100)
    const profit = revenue - ops - capitalNeeded
    const annualized = profit * turns
    const roc = capitalNeeded > 0 ? (annualized / capitalNeeded) * 100 : 0
    
    cashTurnEfficiencyData.push({
      turns,
      turnLabel: `${turns}x`,
      daysPerTurn: Math.round(daysPerTurn),
      capitalRequired: capitalNeeded,
      profitPerTurn: profit,
      annualProfit: annualized,
      annualROC: roc,
    })
  }
  
  // Capital deployment over time chart - shows cumulative capital vs returns
  const capitalDeploymentData = []
  let cumulativeCapital = 0
  let cumulativeRevenue = 0
  let cumulativeProfit = 0
  
  for (let month = 1; month <= 12; month++) {
    // Each month we deploy capital
    const monthlyCapital = monthlyAllInRunRate
    cumulativeCapital += monthlyCapital
    
    // Returns start coming in after cash cycle delay
    const monthsOfReturns = Math.max(0, month - (cashCycleDays / 30))
    if (monthsOfReturns > 0) {
      const monthlyRevenue = monthlyMSRPRunRate * (recoveryRate / 100) * (1 - opsFeeRate / 100)
      cumulativeRevenue = monthlyRevenue * monthsOfReturns
      cumulativeProfit = cumulativeRevenue - (monthlyCapital * monthsOfReturns)
    }
    
    capitalDeploymentData.push({
      month,
      monthLabel: `M${month}`,
      cumulativeCapital,
      cumulativeRevenue,
      cumulativeProfit,
      netPosition: cumulativeRevenue - cumulativeCapital,
    })
  }

  // Recovery rate sensitivity analysis
  const recoverySensitivityData = []
  for (let i = 5; i <= 35; i += 5) {
    const revenue = avgWeeklyMSRP * cashCycleWeeks * (i / 100)
    const ops = revenue * (opsFeeRate / 100)
    const profit = revenue - ops - capitalRequired
    const roc = capitalRequired > 0 ? (profit * cashTurnsPerYear / capitalRequired) * 100 : 0
    
    recoverySensitivityData.push({
      rate: i,
      rateLabel: `${i}%`,
      profitPerTurn: profit,
      annualROC: roc,
    })
  }

  // Calculate profit scenarios for each week
  const weeklyProfits: WeeklyProfit[] = summaries.map(s => {
    const recovery15 = (s.totalMSRP * 0.15) - s.totalAllIn
    const recovery20 = (s.totalMSRP * 0.20) - s.totalAllIn
    const recovery25 = (s.totalMSRP * 0.25) - s.totalAllIn
    const recovery30 = (s.totalMSRP * 0.30) - s.totalAllIn

    return {
      week: `${s.periodStart.substring(5)}`,
      recovery15,
      recovery20,
      recovery25,
      recovery30,
    }
  })

  // Chart data for trends
  const trendData = summaries.map(s => ({
    week: `${s.periodStart.substring(5)}`,
    msrp: s.totalMSRP,
    allIn: s.totalAllIn,
    items: s.totalItems,
    pallets: s.totalPallets,
    cogsPercent: s.allInPercentMSRP,
  }))

  // Monthly run rate chart data
  const monthlyRunRateData = [
    {
      metric: "Monthly MSRP",
      value: monthlyMSRPRunRate,
      fill: "oklch(0.72 0.15 185)"
    },
    {
      metric: "Monthly All-in",
      value: monthlyAllInRunRate,
      fill: "oklch(0.65 0.20 30)"
    },
    {
      metric: "Net Cash Needed",
      value: monthlyAllInRunRate,
      fill: "oklch(0.75 0.16 85)"
    }
  ]

  // Weekly profit scenarios chart data
  const weeklyProfitScenariosData = [
    {
      scenario: "15% Recovery",
      profit: avgWeeklyMSRP * 0.15 - avgWeeklyAllIn,
      fill: "oklch(0.65 0.20 30)"
    },
    {
      scenario: "20% Recovery",
      profit: avgWeeklyMSRP * 0.20 - avgWeeklyAllIn,
      fill: "oklch(0.75 0.16 85)"
    },
    {
      scenario: "25% Recovery",
      profit: avgWeeklyMSRP * 0.25 - avgWeeklyAllIn,
      fill: "oklch(0.72 0.15 185)"
    },
    {
      scenario: "30% Recovery",
      profit: avgWeeklyMSRP * 0.30 - avgWeeklyAllIn,
      fill: "oklch(0.70 0.18 160)"
    }
  ]

  const columns: Column<WeeklySummary>[] = [
    {
      key: "periodStart",
      header: "Week Start",
      render: (value) => new Date(value as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      className: "font-medium",
    },
    {
      key: "periodEnd",
      header: "Week End",
      render: (value) => new Date(value as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      className: "font-medium",
    },
    {
      key: "totalOrders",
      header: "Orders",
      render: (value) => formatNumber(value as number),
      className: "font-mono text-right",
    },
    {
      key: "totalMSRP",
      header: "Total MSRP",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "totalAllIn",
      header: "All-in Cost",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "allInPercentMSRP",
      header: "COGS %",
      render: (value) => formatPercent(value as number),
      className: "font-mono text-right",
    },
    {
      key: "totalItems",
      header: "Items",
      render: (value) => formatNumber(value as number),
      className: "font-mono text-right",
    },
    {
      key: "totalPallets",
      header: "Pallets",
      render: (value) => formatNumber(value as number),
      className: "font-mono text-right",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Weekly Summaries & Cash Cycle Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Weekly sourcing metrics, cash turns, capital requirements, and ROC projections
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard
          title="Avg Weekly MSRP"
          value={formatCurrency(avgWeeklyMSRP)}
          subtitle="Run rate"
          icon={DollarSign}
        />
        <KPICard
          title="Avg Weekly All-in"
          value={formatCurrency(avgWeeklyAllIn)}
          subtitle="Cost per week"
          icon={TrendingUp}
        />
        <KPICard
          title="Cash Turns/Year"
          value={formatDecimal(cashTurnsPerYear)}
          subtitle={`${cashCycleDays} day cycle`}
          icon={RefreshCw}
        />
        <KPICard
          title="Capital Required"
          value={formatCurrency(capitalRequired)}
          subtitle="Working capital"
          icon={Clock}
        />
        <KPICard
          title="Expected Profit"
          value={formatCurrency(profitPerTurn)}
          subtitle={`@ ${recoveryRate}% recovery`}
          icon={Banknote}
        />
        <KPICard
          title="Sourcing %"
          value={formatPercent(effectiveSourcingPercent)}
          subtitle={sourcingPercent !== null ? "Override" : "Actual"}
          icon={Banknote}
        />
      </div>


      {/* Annual Profit Projection Banner */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Weekly MSRP</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(avgWeeklyMSRP)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Sourcing Cost ({formatPercent(effectiveSourcingPercent)})</p>
              <p className="text-2xl font-bold text-destructive">-{formatCurrency(avgWeeklyAllIn)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Gross Revenue ({recoveryRate}%)</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(avgWeeklyMSRP * (recoveryRate / 100))}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Weekly Net Profit</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency((avgWeeklyMSRP * (recoveryRate / 100) * (1 - opsFeeRate / 100)) - avgWeeklyAllIn)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Monthly Net Profit</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(((avgWeeklyMSRP * (recoveryRate / 100) * (1 - opsFeeRate / 100)) - avgWeeklyAllIn) * 4.33)}</p>
            </div>
            <div className="text-center border-l-2 border-primary pl-6">
              <p className="text-sm text-muted-foreground mb-1">ANNUAL NET PROFIT</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(((avgWeeklyMSRP * (recoveryRate / 100) * (1 - opsFeeRate / 100)) - avgWeeklyAllIn) * 52)}</p>
              <p className="text-xs text-muted-foreground mt-1">52 weeks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Cycle Settings */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Cash Cycle Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="cash-cycle" className="text-sm text-muted-foreground">
                Cash Cycle (Days)
              </Label>
              <Input
                id="cash-cycle"
                type="number"
                value={cashCycleDays}
                onChange={(e) => setCashCycleDays(Number(e.target.value))}
                className="mt-2 font-mono"
                min={7}
                max={180}
              />
              <p className="mt-1 text-xs text-muted-foreground">Days from purchase to cash collection</p>
            </div>
            <div>
              <Label htmlFor="recovery-rate" className="text-sm text-muted-foreground">
                Expected Recovery Rate (%)
              </Label>
              <Input
                id="recovery-rate"
                type="number"
                value={recoveryRate}
                onChange={(e) => setRecoveryRate(Number(e.target.value))}
                className="mt-2 font-mono"
                min={5}
                max={50}
              />
              <p className="mt-1 text-xs text-muted-foreground">% of MSRP expected to recover</p>
            </div>
            <div>
              <Label htmlFor="ops-fee" className="text-sm text-muted-foreground">
                Ops Fee Rate (%)
              </Label>
              <Input
                id="ops-fee"
                type="number"
                value={opsFeeRate}
                onChange={(e) => setOpsFeeRate(Number(e.target.value))}
                className="mt-2 font-mono"
                min={0}
                max={50}
              />
              <p className="mt-1 text-xs text-muted-foreground">0% for wholesale, 30% for auction</p>
            </div>
            <div>
              <Label htmlFor="sourcing-percent" className="text-sm text-muted-foreground">
                Sourcing % of MSRP (Override)
              </Label>
              <Input
                id="sourcing-percent"
                type="number"
                value={sourcingPercent ?? ""}
                onChange={(e) => setSourcingPercent(e.target.value === "" ? null : Number(e.target.value))}
                className="mt-2 font-mono"
                min={1}
                max={50}
                placeholder={effectiveSourcingPercent.toFixed(1) + "% (actual)"}
              />
              <p className="mt-1 text-xs text-muted-foreground">Leave empty to use actual sourcing cost</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capital & Cash Turn KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">Per-Turn Economics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Capital Deployed</span>
              <span className="font-mono font-bold text-foreground">{formatCurrency(capitalRequired)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Expected Revenue</span>
              <span className="font-mono font-bold text-primary">{formatCurrency(expectedRevenue)}</span>
            </div>
            {opsFeeRate > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ops Fee ({opsFeeRate}%)</span>
                <span className="font-mono text-muted-foreground">-{formatCurrency(opsFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-sm text-muted-foreground">Profit Per Turn</span>
              <span className={`font-mono font-bold ${profitPerTurn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(profitPerTurn)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Margin Per Turn</span>
              <span className={`font-mono font-bold ${marginPerTurn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(marginPerTurn)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">Annualized Returns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cash Turns/Year</span>
              <span className="font-mono text-xl font-bold text-foreground">{formatDecimal(cashTurnsPerYear)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Annual Profit</span>
              <span className={`font-mono text-xl font-bold ${annualProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(annualProfit)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-sm text-muted-foreground">Annual ROC</span>
              <span className={`font-mono text-2xl font-bold ${annualROC >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(annualROC)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly ROC</span>
              <span className={`font-mono font-bold ${monthlyROC >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(monthlyROC)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">Break-Even Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Break-Even Recovery</span>
              <span className="font-mono text-xl font-bold text-foreground">{formatPercent(breakEvenRecoveryRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Current Recovery</span>
              <span className="font-mono text-xl font-bold text-primary">{recoveryRate}%</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-sm text-muted-foreground">Margin of Safety</span>
              <span className={`font-mono font-bold ${recoveryRate > breakEvenRecoveryRate ? 'text-primary' : 'text-destructive'}`}>
                {formatPercent(recoveryRate - breakEvenRecoveryRate)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              You need at least {formatPercent(breakEvenRecoveryRate)} recovery to break even with {cashCycleDays}-day turns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Turn Efficiency Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Cash Turn Efficiency: Annual ROC by Turn Frequency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashTurnEfficiencyData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <defs>
                  <linearGradient id="rocGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.70 0.18 160)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.70 0.18 160)" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis
                  dataKey="turns"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  label={{ 
                    value: "Cash Turns per Year", 
                    position: "insideBottom", 
                    offset: -10,
                    style: { fill: "oklch(0.65 0.01 260)", fontSize: 14, fontWeight: 600 }
                  }}
                  tickFormatter={(value) => `${value}x`}
                />
                <YAxis
                  yAxisId="left"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  label={{ 
                    value: "Annual ROC (%)", 
                    angle: -90, 
                    position: "insideLeft",
                    style: { fill: "oklch(0.65 0.01 260)", fontSize: 14, fontWeight: 600 }
                  }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name.includes("ROC") || name.includes("%")) return [`${value.toFixed(1)}%`, name]
                    return [formatCurrency(value), name]
                  }}
                  labelFormatter={(label) => `${label}x turns/year (${Math.round(365/label)} days/turn)`}
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.25 0.02 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.01 260)"
                  }}
                  labelStyle={{ color: "oklch(0.95 0.01 260)", fontWeight: 600 }}
                  itemStyle={{ color: "oklch(0.85 0.01 260)" }}
                />
                <Legend verticalAlign="top" height={36} />
                
                {/* Current position marker */}
                <ReferenceLine
                  x={cashTurnsPerYear}
                  yAxisId="left"
                  stroke="oklch(0.75 0.16 85)"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  label={{ 
                    value: "Current", 
                    fill: "oklch(0.75 0.16 85)",
                    fontSize: 12,
                    fontWeight: 600,
                    position: "top"
                  }}
                />
                
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="annualROC"
                  stroke="oklch(0.70 0.18 160)"
                  fill="url(#rocGradient)"
                  strokeWidth={3}
                  name="Annual ROC %"
                  dot={{ fill: "oklch(0.70 0.18 160)", strokeWidth: 0, r: 5 }}
                />
                
                <Bar
                  yAxisId="right"
                  dataKey="capitalRequired"
                  fill="oklch(0.72 0.15 185)"
                  opacity={0.6}
                  name="Capital Required"
                  radius={[4, 4, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Key Insight:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Faster turns = Higher ROC</strong>: More frequent capital recycling compounds returns</li>
              <li><strong>Trade-off</strong>: Faster turns may require lower margins (quick sales) or higher ops costs</li>
              <li><strong>Current position</strong>: {cashCycleDays} days = {formatDecimal(cashTurnsPerYear)}x turns/year = {formatPercent(annualROC)} annual ROC</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Rate Sensitivity */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Recovery Rate Sensitivity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={recoverySensitivityData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
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
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  yAxisId="left"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name.includes("ROC")) return [`${value.toFixed(1)}%`, name]
                    return [formatCurrency(value), name]
                  }}
                  labelFormatter={(label) => `${label}% Recovery Rate`}
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.25 0.02 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.01 260)"
                  }}
                  labelStyle={{ color: "oklch(0.95 0.01 260)", fontWeight: 600 }}
                  itemStyle={{ color: "oklch(0.85 0.01 260)" }}
                />
                <Legend verticalAlign="top" height={36} />
                
                {/* Break-even line */}
                <ReferenceLine
                  x={breakEvenRecoveryRate}
                  yAxisId="left"
                  stroke="oklch(0.65 0.20 30)"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  label={{ 
                    value: "Break-Even", 
                    fill: "oklch(0.65 0.20 30)",
                    fontSize: 11,
                    position: "top"
                  }}
                />
                
                {/* Current recovery rate */}
                <ReferenceLine
                  x={recoveryRate}
                  yAxisId="left"
                  stroke="oklch(0.75 0.16 85)"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  label={{ 
                    value: "Current", 
                    fill: "oklch(0.75 0.16 85)",
                    fontSize: 11,
                    position: "top"
                  }}
                />
                
                <Bar
                  yAxisId="left"
                  dataKey="profitPerTurn"
                  fill="oklch(0.72 0.15 185)"
                  name="Profit Per Turn"
                  radius={[4, 4, 0, 0]}
                />
                
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="annualROC"
                  stroke="oklch(0.70 0.18 160)"
                  strokeWidth={3}
                  name="Annual ROC %"
                  dot={{ fill: "oklch(0.70 0.18 160)", strokeWidth: 0, r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Run Rate Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">Monthly Run Rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly MSRP (Sourcing)</span>
              <span className="font-mono text-xl font-bold text-primary">{formatCurrency(monthlyMSRPRunRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly All-in (Cashflow)</span>
              <span className="font-mono text-xl font-bold text-destructive">{formatCurrency(monthlyAllInRunRate)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-sm text-muted-foreground">Net Monthly Cash Needed</span>
              <span className="font-mono text-lg font-bold text-foreground">{formatCurrency(monthlyAllInRunRate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">Avg Profit Per Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">@ 15% Recovery</span>
              <span className={`font-mono ${avgWeeklyMSRP * 0.15 - avgWeeklyAllIn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(avgWeeklyMSRP * 0.15 - avgWeeklyAllIn)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">@ 20% Recovery</span>
              <span className={`font-mono ${avgWeeklyMSRP * 0.20 - avgWeeklyAllIn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(avgWeeklyMSRP * 0.20 - avgWeeklyAllIn)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">@ 25% Recovery</span>
              <span className={`font-mono ${avgWeeklyMSRP * 0.25 - avgWeeklyAllIn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(avgWeeklyMSRP * 0.25 - avgWeeklyAllIn)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">@ 30% Recovery</span>
              <span className={`font-mono ${avgWeeklyMSRP * 0.30 - avgWeeklyAllIn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(avgWeeklyMSRP * 0.30 - avgWeeklyAllIn)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Sourcing Trend */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">Weekly Sourcing Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorMSRP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis dataKey="week" stroke="oklch(0.65 0.01 260)" fontSize={12} />
                <YAxis
                  yAxisId="left"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === "COGS %") return [`${value.toFixed(1)}%`, name]
                    return [formatCurrency(value), name]
                  }}
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
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="msrp"
                  fill="url(#colorMSRP)"
                  stroke="oklch(0.72 0.15 185)"
                  strokeWidth={2}
                  name="Weekly MSRP"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="allIn"
                  fill="oklch(0.75 0.16 85)"
                  name="Weekly All-in"
                  opacity={0.8}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cogsPercent"
                  stroke="oklch(0.65 0.20 30)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.65 0.20 30)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="COGS %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Profit by Recovery Rate */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">Weekly Profit by Recovery Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyProfits} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis dataKey="week" stroke="oklch(0.65 0.01 260)" fontSize={12} />
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
                  dataKey="recovery15"
                  stroke="oklch(0.65 0.20 30)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.65 0.20 30)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="15% Recovery"
                />
                <Line
                  type="monotone"
                  dataKey="recovery20"
                  stroke="oklch(0.75 0.16 85)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.75 0.16 85)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="20% Recovery"
                />
                <Line
                  type="monotone"
                  dataKey="recovery25"
                  stroke="oklch(0.72 0.15 185)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.72 0.15 185)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="25% Recovery"
                />
                <Line
                  type="monotone"
                  dataKey="recovery30"
                  stroke="oklch(0.70 0.18 160)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.70 0.18 160)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="30% Recovery"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Breakdown Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">Weekly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={summaries} />
        </CardContent>
      </Card>
    </div>
  )
}
