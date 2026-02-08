"use client"

import { useState, useEffect } from "react"
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
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.orders) {
          const totalMSRP = result.orders.reduce((sum: number, order: any) => sum + order.totalMSRP, 0)
          const totalAllIn = result.orders.reduce((sum: number, order: any) => sum + order.totalAllIn, 0)

          const scenarios = [15, 18, 20, 25].map((rate) => {
            const expectedRecovery = totalMSRP * (rate / 100)
            const grossProfit = expectedRecovery - totalAllIn
            return {
              rate,
              expectedRecovery,
              grossProfit,
            }
          })

          setData(scenarios)
        }
      })
  }, [])

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
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  backgroundColor: "oklch(0.18 0.02 260)", color: "oklch(0.95 0.01 260)",
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
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/line-items")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.lineItems) {
          const categoryMap: Record<string, { totalMSRP: number; totalAllIn: number }> = {}

          result.lineItems.forEach((item: any) => {
            const category = item.category || "General Merchandise"
            if (!categoryMap[category]) {
              categoryMap[category] = { totalMSRP: 0, totalAllIn: 0 }
            }
            categoryMap[category].totalMSRP += item.msrp || 0
            categoryMap[category].totalAllIn += item.allInCost || 0
          })

          const chartData = Object.entries(categoryMap)
            .map(([category, values]) => ({
              category,
              totalMSRP: values.totalMSRP,
              totalAllIn: values.totalAllIn,
            }))
            .sort((a, b) => b.totalMSRP - a.totalMSRP)
            .slice(0, 10)

          setData(chartData)
        }
      })
  }, [])

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
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
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
                fontSize={11}
                width={110}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.18 0.02 260)", color: "oklch(0.95 0.01 260)",
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
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.orders) {
          // Group orders by date
          const dateMap: Record<string, { totalMSRP: number; totalAllIn: number }> = {}

          result.orders.forEach((order: any) => {
            const date = order.date || order.orderDate
            if (!date) return

            if (!dateMap[date]) {
              dateMap[date] = { totalMSRP: 0, totalAllIn: 0 }
            }
            dateMap[date].totalMSRP += order.totalMSRP || 0
            dateMap[date].totalAllIn += order.totalAllIn || 0
          })

          const chartData = Object.entries(dateMap)
            .map(([date, values]) => ({
              date,
              totalMSRP: values.totalMSRP,
              totalAllIn: values.totalAllIn,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

          setData(chartData)
        }
      })
  }, [])

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Orders Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  try {
                    return new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  } catch {
                    return v
                  }
                }}
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
                  backgroundColor: "oklch(0.18 0.02 260)", color: "oklch(0.95 0.01 260)",
                  border: "1px solid oklch(0.25 0.02 260)",
                  borderRadius: "8px",
                }}
                labelFormatter={(v) => {
                  try {
                    return new Date(v).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                  } catch {
                    return v
                  }
                }}
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
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.orders) {
          const statusMap: Record<string, number> = {}

          result.orders.forEach((order: any) => {
            const status = order.status || "Unknown"
            statusMap[status] = (statusMap[status] || 0) + 1
          })

          const total = result.orders.length
          const chartData = Object.entries(statusMap).map(([status, count]) => ({
            status,
            count,
            percentage: total > 0 ? ((count / total) * 100).toFixed(1) : "0.0",
          }))

          setData(chartData)
        }
      })
  }, [])

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
                data={data}
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
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.18 0.02 260)", color: "oklch(0.95 0.01 260)",
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
