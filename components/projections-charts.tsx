"use client"

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
  ReferenceLine,
} from "recharts"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

interface ScenarioChartProps {
  data: { rate: number; expectedRecovery: number; grossProfit: number; breakeven: number }[]
  totalCOGS: number
  recoveryRate: number
}

export function RecoveryRateChart({ data, totalCOGS, recoveryRate }: ScenarioChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
        <XAxis dataKey="rate" tickFormatter={(v) => `${v}%`} stroke="oklch(0.65 0.01 260)" fontSize={12} />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="oklch(0.65 0.01 260)" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.18 0.02 260)",
            border: "1px solid oklch(0.25 0.02 260)",
            borderRadius: "8px",
          }}
          labelFormatter={(v) => `Recovery Rate: ${v}%`}
          formatter={(value: number) => [formatCurrency(value), ""]}
        />
        <Legend />
        <ReferenceLine
          y={totalCOGS}
          stroke="oklch(0.55 0.22 25)"
          strokeDasharray="5 5"
          label={{ value: "Break-even", position: "right", fill: "oklch(0.55 0.22 25)", fontSize: 12 }}
        />
        <ReferenceLine
          x={recoveryRate}
          stroke="oklch(0.72 0.15 185)"
          strokeDasharray="3 3"
          label={{ value: "Current", position: "top", fill: "oklch(0.72 0.15 185)", fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="expectedRecovery"
          name="Expected Recovery"
          stroke="oklch(0.72 0.15 185)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="grossProfit"
          name="Gross Profit"
          stroke="oklch(0.70 0.18 160)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface ComparisonChartProps {
  data: { rate: string; rateNum: number; expectedRecovery: number; grossProfit: number; cogs: number }[]
}

export function ScenarioComparisonChart({ data }: ComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
        <XAxis dataKey="rate" stroke="oklch(0.65 0.01 260)" fontSize={12} />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="oklch(0.65 0.01 260)" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.18 0.02 260)",
            border: "1px solid oklch(0.25 0.02 260)",
            borderRadius: "8px",
          }}
          formatter={(value: number) => [formatCurrency(value), ""]}
        />
        <Legend />
        <Bar dataKey="expectedRecovery" name="Expected Recovery" fill="oklch(0.72 0.15 185)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="grossProfit" name="Gross Profit" fill="oklch(0.70 0.18 160)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
