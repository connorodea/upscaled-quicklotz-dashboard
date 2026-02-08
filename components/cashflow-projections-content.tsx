"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/kpi-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUp, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, Clock, Target } from "lucide-react"
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
  ComposedChart,
  Area,
  ReferenceLine,
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

export function CashflowProjectionsContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // User adjustable parameters
  const [startingCapital, setStartingCapital] = useState(100000)
  const [weeklySourceTarget, setWeeklySourceTarget] = useState(500000) // MSRP target per week
  const [cashCycleDays, setCashCycleDays] = useState(45)
  const [recoveryRate, setRecoveryRate] = useState(18)
  const [opsFeeRate, setOpsFeeRate] = useState(0) // 0 for wholesale
  const [projectionMonths, setProjectionMonths] = useState(12)
  const [cogsPercent, setCogsPercent] = useState(4.8) // Adjustable COGS % of MSRP
  const [profitSplitPercent, setProfitSplitPercent] = useState(50) // User's share of net profit (50/50 with Sam)

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.orders) {
          setOrders(data.orders)
          // Set initial COGS percent from actual data
          const msrp = data.orders.reduce((sum: number, o: Order) => sum + o.totalMSRP, 0)
          const allIn = data.orders.reduce((sum: number, o: Order) => sum + o.totalAllIn, 0)
          if (msrp > 0) setCogsPercent(Number(((allIn / msrp) * 100).toFixed(1)))
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

  // Calculate actuals from orders
  const totalMSRP = orders.reduce((sum, order) => sum + order.totalMSRP, 0)
  const totalAllIn = orders.reduce((sum, order) => sum + order.totalAllIn, 0)

  // Weekly capital requirement (COGS)
  const weeklyCapitalNeeded = weeklySourceTarget * (cogsPercent / 100)
  const monthlyCapitalNeeded = weeklyCapitalNeeded * 4.33

  // Cash cycle metrics
  const cashCycleWeeks = cashCycleDays / 7
  const cashTurnsPerYear = 365 / cashCycleDays

  // Capital deployed during one full cycle
  const capitalInCycle = weeklyCapitalNeeded * cashCycleWeeks

  // Returns per cycle (full profit before split)
  const revenuePerCycle = weeklySourceTarget * cashCycleWeeks * (recoveryRate / 100)
  const opsFeePerCycle = revenuePerCycle * (opsFeeRate / 100)
  const totalProfitPerCycle = revenuePerCycle - opsFeePerCycle - capitalInCycle
  const userProfitPerCycle = totalProfitPerCycle * (profitSplitPercent / 100) // User's share
  const marginPerCycle = capitalInCycle > 0 ? (totalProfitPerCycle / capitalInCycle) * 100 : 0

  // Monthly projections
  const monthlyRevenue = weeklySourceTarget * 4.33 * (recoveryRate / 100)
  const monthlyOps = monthlyRevenue * (opsFeeRate / 100)
  const monthlyTotalProfit = monthlyRevenue - monthlyOps - monthlyCapitalNeeded
  const monthlyUserProfit = monthlyTotalProfit * (profitSplitPercent / 100) // User's share

  // Annualized returns (user's share)
  const annualUserProfit = userProfitPerCycle * cashTurnsPerYear
  const annualROC = capitalInCycle > 0 ? (annualUserProfit / capitalInCycle) * 100 : 0

  // ============================================
  // CASH FLOW TIMELINE PROJECTION (with profit split)
  // ============================================

  const cashFlowTimeline = []
  let runningCash = startingCapital
  let totalDeployed = 0
  let totalReturned = 0

  // Week by week projection
  for (let week = 1; week <= projectionMonths * 4.33; week++) {
    const weekStart = runningCash

    // Cash outflow: deploying capital for sourcing
    const outflow = weeklyCapitalNeeded
    runningCash -= outflow
    totalDeployed += outflow

    // Cash inflow: returns from previous cycle (user's share only for reinvestment)
    // Returns start after cash cycle delay
    let grossInflow = 0
    let userInflow = 0
    if (week > cashCycleWeeks) {
      grossInflow = weeklySourceTarget * (recoveryRate / 100) * (1 - opsFeeRate / 100)
      const weeklyProfit = grossInflow - weeklyCapitalNeeded
      // User receives COGS back + their share of profit
      userInflow = weeklyCapitalNeeded + (weeklyProfit * (profitSplitPercent / 100))
      runningCash += userInflow
      totalReturned += userInflow
    }

    const netFlow = userInflow - outflow
    const userProfit = userInflow > 0 ? userInflow - outflow : -outflow

    cashFlowTimeline.push({
      week,
      weekLabel: `W${week}`,
      monthLabel: `M${Math.ceil(week / 4.33)}`,
      outflow: -outflow,
      grossInflow,
      userInflow,
      netFlow,
      runningCash,
      userProfit: week > cashCycleWeeks ? userProfit : 0,
      totalDeployed,
      totalReturned,
    })
  }

  // Aggregate to monthly for cleaner visualization
  const monthlyCashFlow = []
  for (let month = 1; month <= projectionMonths; month++) {
    const startWeek = Math.floor((month - 1) * 4.33) + 1
    const endWeek = Math.min(Math.floor(month * 4.33), cashFlowTimeline.length)

    const monthData = cashFlowTimeline.slice(startWeek - 1, endWeek)
    const monthlyOutflow = monthData.reduce((sum, w) => sum + Math.abs(w.outflow), 0)
    const monthlyUserInflow = monthData.reduce((sum, w) => sum + w.userInflow, 0)
    const monthlyNetFlow = monthlyUserInflow - monthlyOutflow
    const endingCash = monthData[monthData.length - 1]?.runningCash || startingCapital

    // Calculate total gross inflow (before split)
    const monthlyGrossInflow = monthData.reduce((sum, w) => sum + w.grossInflow, 0)
    const monthlyTotalProfit = monthlyGrossInflow - monthlyOutflow
    const monthlyUserProfit = monthlyTotalProfit * (profitSplitPercent / 100)
    const monthlySamProfit = monthlyTotalProfit - monthlyUserProfit

    monthlyCashFlow.push({
      month,
      monthLabel: `Month ${month}`,
      outflow: -monthlyOutflow,
      grossInflow: monthlyGrossInflow,
      userInflow: monthlyUserInflow,
      netFlow: monthlyNetFlow,
      endingCash,
      totalProfit: monthlyTotalProfit,
      userProfit: monthlyUserProfit,
      samProfit: monthlySamProfit,
    })
  }

  // ============================================
  // CAPITAL SCALING SCENARIOS (with profit split)
  // ============================================

  // How much capital needed to scale to different MSRP targets
  const scalingScenarios = []
  const msrpTargets = [250000, 500000, 750000, 1000000, 1500000, 2000000]

  for (const targetMSRP of msrpTargets) {
    const weeklyCapital = targetMSRP * (cogsPercent / 100)
    const cycleCapital = weeklyCapital * cashCycleWeeks
    const monthlyCapital = weeklyCapital * 4.33
    const monthlyRevenue = targetMSRP * 4.33 * (recoveryRate / 100)
    const monthlyOps = monthlyRevenue * (opsFeeRate / 100)
    const monthlyTotalProfit = monthlyRevenue - monthlyOps - monthlyCapital
    const monthlyUserProfit = monthlyTotalProfit * (profitSplitPercent / 100)
    const annualUserProfit = monthlyUserProfit * 12
    const roc = cycleCapital > 0 ? (annualUserProfit / cycleCapital) * 100 : 0

    scalingScenarios.push({
      targetMSRP,
      targetLabel: `$${(targetMSRP / 1000).toFixed(0)}k/wk`,
      cycleCapital,
      monthlyCapital,
      monthlyRevenue,
      monthlyTotalProfit,
      monthlyUserProfit,
      annualUserProfit,
      annualROC: roc,
    })
  }

  // ============================================
  // BREAK-EVEN & RUNWAY ANALYSIS
  // ============================================

  // How long until break-even (cumulative returns = cumulative deployments)
  let breakEvenWeek = 0
  for (const week of cashFlowTimeline) {
    if (week.totalReturned >= week.totalDeployed && breakEvenWeek === 0) {
      breakEvenWeek = week.week
      break
    }
  }

  // Cash runway - how many weeks can you operate before running out
  let runwayWeeks = 0
  for (const week of cashFlowTimeline) {
    if (week.runningCash > 0) {
      runwayWeeks = week.week
    } else {
      break
    }
  }

  // Minimum capital needed to sustain operations
  const minCapitalForCycle = capitalInCycle
  const minCapitalWithBuffer = capitalInCycle * 1.25 // 25% buffer

  // Peak capital requirement (lowest cash position)
  const peakCapitalNeeded = Math.abs(Math.min(...cashFlowTimeline.map(w => w.runningCash)))

  // ============================================
  // COMPOUNDING GROWTH PROJECTION (User's 50% reinvested)
  // ============================================

  // If you reinvest your share of profits (50%), how does capital grow?
  const compoundingProjection = []
  let compoundedCapital = startingCapital
  let compoundedMSRP = weeklySourceTarget

  for (let month = 1; month <= 24; month++) {
    const monthlyCapNeeded = compoundedMSRP * (cogsPercent / 100) * 4.33
    const monthlyGrossRev = compoundedMSRP * 4.33 * (recoveryRate / 100) * (1 - opsFeeRate / 100)
    const monthlyTotalProfit = monthlyGrossRev - monthlyCapNeeded
    const monthlyUserProfit = monthlyTotalProfit * (profitSplitPercent / 100)

    // Reinvest user's share of profits
    compoundedCapital += monthlyUserProfit

    // Scale MSRP based on available capital
    // Maximum MSRP = Capital / (COGS% * cashCycleWeeks)
    const maxMSRP = compoundedCapital / ((cogsPercent / 100) * cashCycleWeeks)
    compoundedMSRP = Math.min(maxMSRP, compoundedMSRP * 1.1) // Cap growth at 10% per month

    compoundingProjection.push({
      month,
      monthLabel: `M${month}`,
      capital: compoundedCapital,
      weeklyMSRP: compoundedMSRP,
      monthlyTotalProfit,
      monthlyUserProfit,
      cumulativeUserProfit: compoundedCapital - startingCapital,
      cumulativeTotalProfit: (compoundedCapital - startingCapital) * (100 / profitSplitPercent), // What total profit would have been
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cashflow Projections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cash flow timeline, capital requirements, runway analysis, and growth projections (with {profitSplitPercent}% profit split)
        </p>
      </div>

      {/* Cashflow Summary Banner */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Starting Capital</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(startingCapital)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Capital in Cycle</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(capitalInCycle)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Monthly Profit (100%)</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(monthlyTotalProfit)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Your 50% Share</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(monthlyUserProfit)}</p>
            </div>
            <div className="text-center border-l-2 border-primary pl-6">
              <p className="text-sm text-muted-foreground mb-1">ANNUAL ROC</p>
              <p className="text-3xl font-bold text-primary">{formatPercent(annualROC)}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDecimal(cashTurnsPerYear)}x turns</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Starting Capital"
          value={formatCurrency(startingCapital)}
          icon={Wallet}
        />
        <KPICard
          title="Capital in Cycle"
          value={formatCurrency(capitalInCycle)}
          subtitle={`${cashCycleDays} day cycle`}
          icon={RefreshCw}
        />
        <KPICard
          title="Monthly Total Profit"
          value={formatCurrency(monthlyTotalProfit)}
          subtitle="100% before split"
          icon={DollarSign}
        />
        <KPICard
          title="Monthly Profit (Your 50%)"
          value={formatCurrency(monthlyUserProfit)}
          subtitle={`Sam gets ${formatCurrency(monthlyTotalProfit - monthlyUserProfit)}`}
          icon={monthlyUserProfit >= 0 ? ArrowUpRight : ArrowDownRight}
        />
        <KPICard
          title="Annual ROC (Your Share)"
          value={formatPercent(annualROC)}
          subtitle={`${formatDecimal(cashTurnsPerYear)}x turns/yr`}
          icon={TrendingUp}
        />
      </div>

      {/* Settings */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Projection Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Starting Capital</Label>
              <Input
                type="number"
                value={startingCapital}
                onChange={(e) => setStartingCapital(Number(e.target.value))}
                className="mt-2 font-mono"
                step={10000}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Weekly MSRP Target</Label>
              <Input
                type="number"
                value={weeklySourceTarget}
                onChange={(e) => setWeeklySourceTarget(Number(e.target.value))}
                className="mt-2 font-mono"
                step={50000}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Cash Cycle (Days)</Label>
              <Input
                type="number"
                value={cashCycleDays}
                onChange={(e) => setCashCycleDays(Number(e.target.value))}
                className="mt-2 font-mono"
                min={7}
                max={180}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Recovery Rate (%)</Label>
              <Input
                type="number"
                value={recoveryRate}
                onChange={(e) => setRecoveryRate(Number(e.target.value))}
                className="mt-2 font-mono"
                min={5}
                max={50}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Ops Fee (%)</Label>
              <Input
                type="number"
                value={opsFeeRate}
                onChange={(e) => setOpsFeeRate(Number(e.target.value))}
                className="mt-2 font-mono"
                min={0}
                max={50}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">COGS % of MSRP</Label>
              <Input
                type="number"
                value={cogsPercent}
                onChange={(e) => setCogsPercent(Number(e.target.value))}
                className="mt-2 font-mono"
                min={1}
                max={20}
                step={0.1}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Your Profit Share (%)</Label>
              <Input
                type="number"
                value={profitSplitPercent}
                onChange={(e) => setProfitSplitPercent(Number(e.target.value))}
                className="mt-2 font-mono"
                min={0}
                max={100}
                step={5}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Projection (Months)</Label>
              <Input
                type="number"
                value={projectionMonths}
                onChange={(e) => setProjectionMonths(Number(e.target.value))}
                className="mt-2 font-mono"
                min={3}
                max={24}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">Capital Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Weekly Capital Needed</span>
              <span className="font-mono font-bold text-foreground">{formatCurrency(weeklyCapitalNeeded)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly Capital Needed</span>
              <span className="font-mono font-bold text-foreground">{formatCurrency(monthlyCapitalNeeded)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">Full Cycle Capital</span>
              <span className="font-mono font-bold text-primary">{formatCurrency(capitalInCycle)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">With 25% Buffer</span>
              <span className="font-mono font-bold text-foreground">{formatCurrency(minCapitalWithBuffer)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">Runway Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cash Runway</span>
              <span className="font-mono text-xl font-bold text-primary">{runwayWeeks} weeks</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Break-Even Week</span>
              <span className="font-mono font-bold text-foreground">Week {breakEvenWeek || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">Peak Capital Needed</span>
              <span className="font-mono font-bold text-destructive">{formatCurrency(peakCapitalNeeded)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {startingCapital >= capitalInCycle
                ? "✅ Sufficient capital for one full cycle"
                : "⚠️ Need more capital to fund full cycle"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">Monthly Projections ({profitSplitPercent}% Split)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly Revenue</span>
              <span className="font-mono font-bold text-primary">{formatCurrency(monthlyRevenue)}</span>
            </div>
            {opsFeeRate > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ops Fee ({opsFeeRate}%)</span>
                <span className="font-mono text-muted-foreground">-{formatCurrency(monthlyOps)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly COGS</span>
              <span className="font-mono text-muted-foreground">-{formatCurrency(monthlyCapitalNeeded)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">Total Net Profit</span>
              <span className="font-mono text-foreground">{formatCurrency(monthlyTotalProfit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Your Share ({profitSplitPercent}%)</span>
              <span className={`font-mono font-bold ${monthlyUserProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(monthlyUserProfit)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sam's Share ({100 - profitSplitPercent}%)</span>
              <span className="font-mono">{formatCurrency(monthlyTotalProfit - monthlyUserProfit)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Cash Flow Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Monthly Cash Flow Timeline (Your {profitSplitPercent}% Reinvested)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyCashFlow} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis
                  dataKey="monthLabel"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
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
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.25 0.02 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.01 260)"
                  }}
                  labelStyle={{ color: "oklch(0.95 0.01 260)", fontWeight: 600 }}
                />
                <Legend verticalAlign="top" height={36} />

                {/* Zero line */}
                <ReferenceLine yAxisId="left" y={0} stroke="oklch(0.45 0.02 260)" strokeDasharray="3 3" />

                {/* Cash outflows (negative) */}
                <Bar
                  yAxisId="left"
                  dataKey="outflow"
                  fill="oklch(0.65 0.20 30)"
                  name="Cash Outflow"
                  radius={[4, 4, 0, 0]}
                />

                {/* Cash inflows (positive) */}
                <Bar
                  yAxisId="left"
                  dataKey="userInflow"
                  fill="oklch(0.70 0.18 160)"
                  name="Cash Inflow (Your Share)"
                  radius={[4, 4, 0, 0]}
                />

                {/* Ending cash balance line */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="endingCash"
                  stroke="oklch(0.72 0.15 185)"
                  strokeWidth={3}
                  name="Ending Cash"
                  dot={{ fill: "oklch(0.72 0.15 185)", strokeWidth: 0, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Cash outflows (red) represent capital deployed for sourcing. Inflows (green) are your {profitSplitPercent}% share of returns (COGS + your profit).
            The blue line shows your ending cash balance each month.
          </p>
        </CardContent>
      </Card>

      {/* Profit Split Breakdown Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Monthly Net Profit &amp; 50/50 Split
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyCashFlow} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis
                  dataKey="monthLabel"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                />
                <YAxis
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.25 0.02 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.01 260)"
                  }}
                  labelStyle={{ color: "oklch(0.95 0.01 260)", fontWeight: 600 }}
                />
                <Legend verticalAlign="top" height={36} />

                {/* Zero line */}
                <ReferenceLine y={0} stroke="oklch(0.45 0.02 260)" strokeDasharray="3 3" />

                {/* Total Profit as a line */}
                <Line
                  type="monotone"
                  dataKey="totalProfit"
                  stroke="oklch(0.72 0.15 185)"
                  strokeWidth={3}
                  name="Total Net Profit (100%)"
                  dot={{ fill: "oklch(0.72 0.15 185)", strokeWidth: 0, r: 4 }}
                />

                {/* User's profit (stacked area) */}
                <Bar
                  dataKey="userProfit"
                  fill="oklch(0.70 0.18 160)"
                  name={`Your Share (${profitSplitPercent}%)`}
                  stackId="profit"
                  radius={[0, 0, 0, 0]}
                />

                {/* Sam's profit (stacked on top) */}
                <Bar
                  dataKey="samProfit"
                  fill="oklch(0.75 0.16 85)"
                  name={`Sam's Share (${100 - profitSplitPercent}%)`}
                  stackId="profit"
                  radius={[4, 4, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-md bg-[oklch(0.72_0.15_185/0.15)] border border-[oklch(0.72_0.15_185/0.3)]">
              <p className="text-xs text-muted-foreground">Total Annual Profit</p>
              <p className="font-mono text-lg font-bold text-[oklch(0.72_0.15_185)]">
                {formatCurrency(monthlyCashFlow.reduce((sum, m) => sum + (m.totalProfit > 0 ? m.totalProfit : 0), 0) * (12 / projectionMonths))}
              </p>
            </div>
            <div className="p-3 rounded-md bg-[oklch(0.70_0.18_160/0.15)] border border-[oklch(0.70_0.18_160/0.3)]">
              <p className="text-xs text-muted-foreground">Your Annual Share ({profitSplitPercent}%)</p>
              <p className="font-mono text-lg font-bold text-[oklch(0.70_0.18_160)]">
                {formatCurrency(monthlyCashFlow.reduce((sum, m) => sum + (m.userProfit > 0 ? m.userProfit : 0), 0) * (12 / projectionMonths))}
              </p>
            </div>
            <div className="p-3 rounded-md bg-[oklch(0.75_0.16_85/0.15)] border border-[oklch(0.75_0.16_85/0.3)]">
              <p className="text-xs text-muted-foreground">Sam's Annual Share ({100 - profitSplitPercent}%)</p>
              <p className="font-mono text-lg font-bold text-[oklch(0.75_0.16_85)]">
                {formatCurrency(monthlyCashFlow.reduce((sum, m) => sum + (m.samProfit > 0 ? m.samProfit : 0), 0) * (12 / projectionMonths))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capital Scaling Scenarios */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Capital Requirements by Scale (Your {profitSplitPercent}% Share)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={scalingScenarios} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis
                  dataKey="targetLabel"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  label={{
                    value: "Weekly MSRP Target",
                    position: "insideBottom",
                    offset: -10,
                    style: { fill: "oklch(0.65 0.01 260)", fontSize: 14, fontWeight: 600 }
                  }}
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
                    if (name.includes("ROC") || name.includes("%")) return [`${value.toFixed(1)}%`, name]
                    return [formatCurrency(value), name]
                  }}
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.25 0.02 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.01 260)"
                  }}
                  labelStyle={{ color: "oklch(0.95 0.01 260)", fontWeight: 600 }}
                />
                <Legend verticalAlign="top" height={36} />

                {/* Current capital line */}
                <ReferenceLine
                  yAxisId="left"
                  y={startingCapital}
                  stroke="oklch(0.75 0.16 85)"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  label={{
                    value: "Your Capital",
                    fill: "oklch(0.75 0.16 85)",
                    fontSize: 11,
                    position: "right"
                  }}
                />

                <Bar
                  yAxisId="left"
                  dataKey="cycleCapital"
                  fill="oklch(0.72 0.15 185)"
                  name="Capital Required"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  yAxisId="left"
                  dataKey="annualUserProfit"
                  fill="oklch(0.70 0.18 160)"
                  name="Your Annual Profit"
                  radius={[4, 4, 0, 0]}
                />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="annualROC"
                  stroke="oklch(0.65 0.20 30)"
                  strokeWidth={3}
                  name="Your Annual ROC %"
                  dot={{ fill: "oklch(0.65 0.20 30)", strokeWidth: 0, r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {scalingScenarios.map((scenario) => (
              <div
                key={scenario.targetMSRP}
                className={`p-3 rounded-md ${scenario.cycleCapital <= startingCapital ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'}`}
              >
                <p className="text-xs text-muted-foreground">{scenario.targetLabel}</p>
                <p className="font-mono text-sm font-bold">{formatCurrency(scenario.cycleCapital)}</p>
                <p className="text-xs text-muted-foreground">Your Profit: {formatCurrency(scenario.annualUserProfit)}/yr</p>
                <p className={`text-xs ${scenario.cycleCapital <= startingCapital ? 'text-primary' : 'text-muted-foreground'}`}>
                  {scenario.cycleCapital <= startingCapital ? '✅ Achievable' : '⚠️ Need more'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compounding Growth Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Compounding Growth Projection (Reinvesting Your {profitSplitPercent}% Share)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={compoundingProjection} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <defs>
                  <linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.02 260)" />
                <XAxis
                  dataKey="month"
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  label={{
                    value: "Month",
                    position: "insideBottom",
                    offset: -10,
                    style: { fill: "oklch(0.65 0.01 260)", fontSize: 14, fontWeight: 600 }
                  }}
                />
                <YAxis
                  stroke="oklch(0.65 0.01 260)"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Month ${label}`}
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 260)",
                    border: "1px solid oklch(0.25 0.02 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.01 260)"
                  }}
                  labelStyle={{ color: "oklch(0.95 0.01 260)", fontWeight: 600 }}
                />
                <Legend verticalAlign="top" height={36} />

                <Area
                  type="monotone"
                  dataKey="capital"
                  stroke="oklch(0.72 0.15 185)"
                  fill="url(#capitalGradient)"
                  strokeWidth={3}
                  name="Your Total Capital"
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="cumulativeUserProfit"
                  stroke="oklch(0.70 0.18 160)"
                  strokeWidth={2}
                  name="Your Cumulative Profit"
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="weeklyMSRP"
                  stroke="oklch(0.75 0.16 85)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Weekly MSRP Capacity"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">24-Month Projection Summary (Your {profitSplitPercent}% Reinvested):</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Starting Capital</p>
                <p className="font-mono font-bold">{formatCurrency(startingCapital)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your Capital (M24)</p>
                <p className="font-mono font-bold text-primary">{formatCurrency(compoundingProjection[23]?.capital || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your Total Profit (M24)</p>
                <p className="font-mono font-bold text-primary">{formatCurrency(compoundingProjection[23]?.cumulativeUserProfit || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Growth Multiple</p>
                <p className="font-mono font-bold">{formatDecimal((compoundingProjection[23]?.capital || startingCapital) / startingCapital)}x</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Assumptions */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Model Assumptions & Definitions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground mb-2">Cash Cycle</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Cash Cycle Days</strong>: Time from capital deployment to cash collection</li>
                <li><strong>Capital in Cycle</strong>: Total capital tied up during one complete cycle</li>
                <li><strong>Cash Turns</strong>: How many times capital recycles per year (365 / cycle days)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Returns</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>ROC (Return on Capital)</strong>: Your annual profit / Capital deployed</li>
                <li><strong>Recovery Rate</strong>: % of MSRP recovered through sales</li>
                <li><strong>COGS %</strong>: Your actual cost as % of MSRP (currently {formatPercent(cogsPercent)})</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Profit Split</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Your Share</strong>: {formatPercent(profitSplitPercent)} of net profit</li>
                <li><strong>Sam's Share</strong>: {formatPercent(100 - profitSplitPercent)} of net profit</li>
                <li><strong>Reinvestment</strong>: Only your share is reinvested for compounding growth</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
