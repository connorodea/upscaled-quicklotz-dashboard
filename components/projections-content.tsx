"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { KPICard } from "@/components/kpi-card"
import { aggregateMetrics } from "@/lib/mock-data"
import { TrendingUp, DollarSign, Percent, Target } from "lucide-react"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

function ChartPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

const RecoveryRateChart = dynamic(
  () => import("@/components/projections-charts").then((mod) => mod.RecoveryRateChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
)

const ScenarioComparisonChart = dynamic(
  () => import("@/components/projections-charts").then((mod) => mod.ScenarioComparisonChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
)

export function ProjectionsContent() {
  const [recoveryRate, setRecoveryRate] = useState(18)
  const comparisonRates = [15, 18, 20, 22, 25]

  const totalCOGS = aggregateMetrics.totalAllIn
  const totalMSRP = aggregateMetrics.totalMSRP

  const currentProjection = useMemo(() => {
    const expectedRecovery = totalMSRP * (recoveryRate / 100)
    const grossProfit = expectedRecovery - totalCOGS
    const profitMargin = (grossProfit / expectedRecovery) * 100
    const roi = (grossProfit / totalCOGS) * 100
    return { expectedRecovery, grossProfit, profitMargin, roi }
  }, [recoveryRate, totalMSRP, totalCOGS])

  const comparisonData = useMemo(() => {
    return comparisonRates.map((rate) => {
      const expectedRecovery = totalMSRP * (rate / 100)
      const grossProfit = expectedRecovery - totalCOGS
      return {
        rate: `${rate}%`,
        rateNum: rate,
        expectedRecovery,
        grossProfit,
        cogs: totalCOGS,
      }
    })
  }, [totalMSRP, totalCOGS])

  const scenarioChartData = useMemo(() => {
    const rates = Array.from({ length: 16 }, (_, i) => 10 + i)
    return rates.map((rate) => {
      const expectedRecovery = totalMSRP * (rate / 100)
      const grossProfit = expectedRecovery - totalCOGS
      return {
        rate,
        expectedRecovery,
        grossProfit,
        breakeven: totalCOGS,
      }
    })
  }, [totalMSRP, totalCOGS])

  const breakEvenRate = (totalCOGS / totalMSRP) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financial Projections</h1>
        <p className="mt-1 text-sm text-muted-foreground">Model recovery scenarios and analyze profitability</p>
      </div>

      {/* Recovery Rate Control */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <Target className="h-5 w-5 text-primary" />
            Recovery Rate Simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Adjust recovery rate:</span>
            <span className="text-2xl font-bold text-primary">{recoveryRate}%</span>
          </div>
          <Slider
            value={[recoveryRate]}
            onValueChange={(value) => setRecoveryRate(value[0])}
            min={10}
            max={30}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10%</span>
            <span className="text-warning">Break-even: {breakEvenRate.toFixed(1)}%</span>
            <span>30%</span>
          </div>
        </CardContent>
      </Card>

      {/* Projected KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard title="Expected Recovery" value={formatCurrency(currentProjection.expectedRecovery)} className="border-primary/30" />
        <KPICard
          title="Gross Profit"
          value={formatCurrency(currentProjection.grossProfit)}
          delta={currentProjection.grossProfit > 0 ? 1 : -1}
          deltaLabel={currentProjection.grossProfit > 0 ? "profitable" : "loss"}
          className={currentProjection.grossProfit > 0 ? "border-success/30" : "border-destructive/30"}
        />
        <KPICard title="Profit Margin" value={`${currentProjection.profitMargin.toFixed(1)}%`} />
        <KPICard title="ROI" value={`${currentProjection.roi.toFixed(1)}%`} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recovery Scenarios Line Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recovery Rate vs Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <RecoveryRateChart data={scenarioChartData} totalCOGS={totalCOGS} recoveryRate={recoveryRate} />
            </div>
          </CardContent>
        </Card>

        {/* Comparison Bar Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <DollarSign className="h-5 w-5 text-primary" />
              Scenario Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ScenarioComparisonChart data={comparisonData} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <Percent className="h-5 w-5 text-primary" />
            Recovery Scenario Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recovery Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Expected Recovery
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    COGS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Gross Profit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    ROI
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b border-border transition-colors hover:bg-muted/50 ${
                      row.rateNum === recoveryRate ? "bg-primary/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={`font-medium ${row.rateNum === recoveryRate ? "text-primary" : "text-card-foreground"}`}>
                        {row.rate}
                        {row.rateNum === recoveryRate && <span className="ml-2 text-xs text-primary">(selected)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-card-foreground">{formatCurrency(row.expectedRecovery)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(row.cogs)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${row.grossProfit > 0 ? "text-success" : "text-destructive"}`}>
                      {formatCurrency(row.grossProfit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-card-foreground">
                      {((row.grossProfit / row.cogs) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
