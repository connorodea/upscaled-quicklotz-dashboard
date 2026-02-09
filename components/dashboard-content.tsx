"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { KPICard } from "@/components/kpi-card"
import { StatusBadge } from "@/components/status-badge"
import { DataTable, type Column } from "@/components/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import { DashboardSkeleton } from "@/components/skeletons"
import { ComparisonPicker, useComparison } from "@/components/comparison-picker"
import { getComparisonRanges, filterByDateRange, calculateDelta, type ComparisonPeriod } from "@/lib/comparison"

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
  trackingStatus: string
  carrier?: string
  trackingNumber?: string
  eta?: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value)

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

export function DashboardContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { comparisonPeriod, setComparisonPeriod } = useComparison("week")

  const fetchData = () => {
    setRefreshing(true)
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.orders) {
          setOrders(data.orders)
        }
        setLoading(false)
        setRefreshing(false)
      })
      .catch((err) => {
        console.error("Failed to fetch orders:", err)
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = () => {
    fetchData()
    // Trigger a full page refresh to reload all charts
    window.location.reload()
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  // Calculate aggregate metrics
  const totalMSRP = orders.reduce((sum, order) => sum + order.totalMSRP, 0)
  const totalAllIn = orders.reduce((sum, order) => sum + order.totalAllIn, 0)
  const totalItems = orders.reduce((sum, order) => sum + order.totalItems, 0)
  const totalPallets = orders.reduce((sum, order) => sum + order.totalPallets, 0)
  const avgPercentOfMSRP = totalMSRP > 0 ? (totalAllIn / totalMSRP) * 100 : 0

  // Calculate profit scenarios
  const profit20Pct = (totalMSRP * 0.20) - totalAllIn
  const profit25Pct = (totalMSRP * 0.25) - totalAllIn
  const profit30Pct = (totalMSRP * 0.30) - totalAllIn

  // Comparison calculations
  const comparisonData = useMemo(() => {
    const ranges = getComparisonRanges(comparisonPeriod)
    if (!ranges) return null

    const currentOrders = filterByDateRange(orders, ranges.current)
    const previousOrders = filterByDateRange(orders, ranges.previous)

    const currentMSRP = currentOrders.reduce((sum, o) => sum + o.totalMSRP, 0)
    const previousMSRP = previousOrders.reduce((sum, o) => sum + o.totalMSRP, 0)

    const currentAllIn = currentOrders.reduce((sum, o) => sum + o.totalAllIn, 0)
    const previousAllIn = previousOrders.reduce((sum, o) => sum + o.totalAllIn, 0)

    const currentItems = currentOrders.reduce((sum, o) => sum + o.totalItems, 0)
    const previousItems = previousOrders.reduce((sum, o) => sum + o.totalItems, 0)

    const currentPallets = currentOrders.reduce((sum, o) => sum + o.totalPallets, 0)
    const previousPallets = previousOrders.reduce((sum, o) => sum + o.totalPallets, 0)

    return {
      label: ranges.label,
      msrpDelta: calculateDelta(currentMSRP, previousMSRP),
      allInDelta: calculateDelta(currentAllIn, previousAllIn),
      itemsDelta: calculateDelta(currentItems, previousItems),
      palletsDelta: calculateDelta(currentPallets, previousPallets),
      currentOrders: currentOrders.length,
      previousOrders: previousOrders.length,
    }
  }, [orders, comparisonPeriod])

  const topOrders = [...orders].sort((a, b) => b.totalMSRP - a.totalMSRP).slice(0, 5)

  const topOrderColumns: Column<Order>[] = [
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Executive Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time sourcing metrics and analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ComparisonPicker
            value={comparisonPeriod}
            onChange={setComparisonPeriod}
          />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Portfolio Summary Banner */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total MSRP</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMSRP)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total All-in Cost</p>
              <p className="text-2xl font-bold text-destructive">-{formatCurrency(totalAllIn)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Avg COGS %</p>
              <p className="text-2xl font-bold text-foreground">{avgPercentOfMSRP.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Items</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(totalItems)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Pallets</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(totalPallets)}</p>
            </div>
            <div className="text-center border-l-2 border-primary pl-6">
              <p className="text-sm text-muted-foreground mb-1">PROFIT @ 25%</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(profit25Pct)}</p>
              <p className="text-xs text-muted-foreground mt-1">{orders.length} orders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total MSRP"
          value={formatCurrency(totalMSRP)}
          delta={comparisonData?.msrpDelta}
          deltaLabel={comparisonData?.label}
        />
        <KPICard
          title="Total All-in"
          value={formatCurrency(totalAllIn)}
          delta={comparisonData?.allInDelta}
          deltaLabel={comparisonData?.label}
        />
        <KPICard
          title="Avg % of MSRP"
          value={`${avgPercentOfMSRP.toFixed(1)}%`}
        />
        <KPICard
          title="Total Items"
          value={formatNumber(totalItems)}
          delta={comparisonData?.itemsDelta}
          deltaLabel={comparisonData?.label}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecoveryScenariosChart key={refreshing ? 'refresh-1' : 'normal-1'} />
        <CategoryMixChart key={refreshing ? 'refresh-2' : 'normal-2'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OrdersOverTimeChart key={refreshing ? 'refresh-3' : 'normal-3'} />
        <OrderStatusChart key={refreshing ? 'refresh-4' : 'normal-4'} />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Top Orders by MSRP</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={topOrderColumns} data={topOrders} />
        </CardContent>
      </Card>
    </div>
  )
}
