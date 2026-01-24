"use client"

import dynamic from "next/dynamic"
import { KPICard } from "@/components/kpi-card"
import { StatusBadge } from "@/components/status-badge"
import { DataTable, type Column } from "@/components/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { aggregateMetrics, sparklineData, orders } from "@/lib/mock-data"
import { RefreshCw } from "lucide-react"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value)

const topOrders = orders.sort((a, b) => b.totalMSRP - a.totalMSRP).slice(0, 5)

function ChartPlaceholder() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex h-72 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </CardContent>
    </Card>
  )
}

// Dynamic imports with SSR disabled
const RecoveryScenariosChart = dynamic(
  () => import("@/components/dashboard-charts").then((mod) => mod.RecoveryScenariosChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
)

const CategoryMixChart = dynamic(
  () => import("@/components/dashboard-charts").then((mod) => mod.CategoryMixChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
)

const OrdersOverTimeChart = dynamic(
  () => import("@/components/dashboard-charts").then((mod) => mod.OrdersOverTimeChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
)

const OrderStatusChart = dynamic(
  () => import("@/components/dashboard-charts").then((mod) => mod.OrderStatusChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
)

const topOrderColumns: Column<(typeof topOrders)[0]>[] = [
  { key: "orderId", header: "Order ID", className: "font-mono text-primary" },
  {
    key: "totalMSRP",
    header: "Total MSRP",
    render: (value) => formatCurrency(value as number),
    className: "font-mono text-right",
  },
  {
    key: "totalAllIn",
    header: "All-in",
    render: (value) => formatCurrency(value as number),
    className: "font-mono text-right",
  },
  {
    key: "percentOfMSRP",
    header: "% of MSRP",
    render: (value) => `${(value as number).toFixed(1)}%`,
    className: "font-mono text-right",
  },
  {
    key: "status",
    header: "Status",
    render: (value) => (
      <StatusBadge
        status={value as string}
        type={
          value === "Delivered"
            ? "success"
            : value === "Shipped"
              ? "info"
              : value === "Processing"
                ? "warning"
                : "neutral"
        }
      />
    ),
  },
]

export function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Executive Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time overview of sourcing operations
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          <span>Last synced 2 minutes ago</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          title="Total MSRP"
          value={formatCurrency(aggregateMetrics.totalMSRP)}
          delta={8.2}
          sparklineData={sparklineData.msrp}
        />
        <KPICard
          title="Total All-in (COGS)"
          value={formatCurrency(aggregateMetrics.totalAllIn)}
          delta={5.4}
          sparklineData={sparklineData.allIn}
        />
        <KPICard
          title="Blended % of MSRP"
          value={`${aggregateMetrics.blendedPercentOfMSRP.toFixed(1)}%`}
          delta={-0.8}
        />
        <KPICard
          title="Orders"
          value={formatNumber(aggregateMetrics.ordersCount)}
          delta={16.7}
        />
        <KPICard
          title="Total Pallets"
          value={formatNumber(aggregateMetrics.totalPallets)}
          delta={12.3}
          sparklineData={sparklineData.pallets}
        />
        <KPICard
          title="Total Items"
          value={formatNumber(aggregateMetrics.totalItems)}
          delta={9.1}
          sparklineData={sparklineData.items}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecoveryScenariosChart />
        <CategoryMixChart />
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <OrdersOverTimeChart />
        <OrderStatusChart />
      </div>

      {/* Top Orders Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Top Orders by MSRP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={topOrderColumns} data={topOrders} />
        </CardContent>
      </Card>
    </div>
  )
}
