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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  categoryBreakdown,
  ordersOverTime,
  orderStatusBreakdown,
  recoveryScenarios,
} from "@/lib/mock-data"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const COLORS = [
  "oklch(0.72 0.15 185)",
  "oklch(0.70 0.18 160)",
  "oklch(0.75 0.16 85)",
  "oklch(0.65 0.20 30)",
]

export function RecoveryScenariosChart() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Recovery Scenarios (15% - 25%)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={recoveryScenarios} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
              <XAxis
                dataKey="rate"
                tickFormatter={(v) => `${v}%`}
                stroke="oklch(0.65 0.01 260)"
                fontSize={12}
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                stroke="oklch(0.65 0.01 260)"
                fontSize={12}
              />
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
              <Bar dataKey="expectedRecovery" name="Expected Recovery" fill="oklch(0.72 0.15 185)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="grossProfit" name="Gross Profit" fill="oklch(0.70 0.18 160)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function CategoryMixChart() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Category Mix (MSRP vs All-in)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryBreakdown}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
              <XAxis
                type="number"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                stroke="oklch(0.65 0.01 260)"
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="category"
                stroke="oklch(0.65 0.01 260)"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.18 0.02 260)",
                  border: "1px solid oklch(0.25 0.02 260)",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [formatCurrency(value), ""]}
              />
              <Legend />
              <Bar dataKey="totalMSRP" name="Total MSRP" fill="oklch(0.72 0.15 185)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="totalAllIn" name="Total All-in" fill="oklch(0.75 0.16 85)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function OrdersOverTimeChart() {
  return (
    <Card className="border-border bg-card lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Orders Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ordersOverTime} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                stroke="oklch(0.65 0.01 260)"
                fontSize={12}
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                stroke="oklch(0.65 0.01 260)"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.18 0.02 260)",
                  border: "1px solid oklch(0.25 0.02 260)",
                  borderRadius: "8px",
                }}
                labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                formatter={(value: number) => [formatCurrency(value), ""]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalMSRP"
                name="Total MSRP"
                stroke="oklch(0.72 0.15 185)"
                strokeWidth={2}
                dot={{ fill: "oklch(0.72 0.15 185)", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="totalAllIn"
                name="Total All-in"
                stroke="oklch(0.70 0.18 160)"
                strokeWidth={2}
                dot={{ fill: "oklch(0.70 0.18 160)", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function OrderStatusChart() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Order Status Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={orderStatusBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="count"
                nameKey="status"
                label={({ status, percentage }) => `${status} (${percentage}%)`}
                labelLine={false}
              >
                {orderStatusBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.18 0.02 260)",
                  border: "1px solid oklch(0.25 0.02 260)",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => [`${value} orders`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
