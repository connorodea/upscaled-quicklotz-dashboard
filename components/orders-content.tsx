"use client"

import { useState, useEffect } from "react"
import { TrackingDrawer } from "@/components/tracking-drawer"
import { StatusBadge } from "@/components/status-badge"
import { KPICard } from "@/components/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  Truck
} from "lucide-react"
import { OrdersSkeleton } from "@/components/skeletons"
import { ExportButton } from "@/components/export-button"
import { DateRangePicker, useDateRange } from "@/components/date-range-picker"
import { formatCurrencyExport, formatDateExport, formatNumberExport, formatPercentExport } from "@/lib/export"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
  trackingStatus: string
  carrier?: string
  trackingNumber?: string
  eta?: string
}

interface LineItem {
  lineItemId: number
  orderId: string
  itemIndex: number
  updBbyId: string
  title: string
  category: string
  brands: string
  condition: string
  msrp: number
  lotPrice: number
  allocatedShipping: number
  allInCost: number
  itemCount: number
  allInPerItem: number
  palletIds: string[]
  palletCount: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatCurrency2 = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value)

const STATUS_COLORS = [
  "oklch(0.72 0.15 185)",
  "oklch(0.70 0.18 160)",
  "oklch(0.75 0.16 85)",
  "oklch(0.65 0.20 30)",
]

export function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const { dateRange, setDateRange, filterByDateRange } = useDateRange()
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])
  const [lineItemsCache, setLineItemsCache] = useState<Record<string, LineItem[]>>({})
  const [loadingLineItems, setLoadingLineItems] = useState<Record<string, boolean>>({})
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null)

  const toggleOrderExpand = async (orderId: string) => {
    const isExpanding = !expandedOrders.includes(orderId)

    setExpandedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    )

    // Fetch line items if expanding and not already cached
    if (isExpanding && !lineItemsCache[orderId]) {
      setLoadingLineItems(prev => ({ ...prev, [orderId]: true }))
      try {
        const response = await fetch(`/api/order-line-items?orderId=${orderId}`)
        const data = await response.json()
        if (data.success && data.lineItems) {
          setLineItemsCache(prev => ({ ...prev, [orderId]: data.lineItems }))
        }
      } catch (error) {
        console.error(`Failed to fetch line items for ${orderId}:`, error)
      } finally {
        setLoadingLineItems(prev => ({ ...prev, [orderId]: false }))
      }
    }
  }

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

  if (loading) {
    return <OrdersSkeleton />
  }

  const filteredOrders = filterByDateRange(orders).filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesSearch =
      searchQuery === "" ||
      order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipTo.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Calculate metrics
  const totalMSRP = filteredOrders.reduce((sum, order) => sum + order.totalMSRP, 0)
  const totalAllIn = filteredOrders.reduce((sum, order) => sum + order.totalAllIn, 0)
  const totalItems = filteredOrders.reduce((sum, order) => sum + order.totalItems, 0)
  const totalPallets = filteredOrders.reduce((sum, order) => sum + order.totalPallets, 0)

  // Status distribution
  const statusMap: Record<string, number> = {}
  filteredOrders.forEach(order => {
    statusMap[order.status] = (statusMap[order.status] || 0) + 1
  })
  const statusData = Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
  }))

  // Orders over time
  const ordersByDate: Record<string, { count: number; totalMSRP: number; totalAllIn: number }> = {}
  filteredOrders.forEach(order => {
    const date = new Date(order.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    if (!ordersByDate[date]) {
      ordersByDate[date] = { count: 0, totalMSRP: 0, totalAllIn: 0 }
    }
    ordersByDate[date].count++
    ordersByDate[date].totalMSRP += order.totalMSRP
    ordersByDate[date].totalAllIn += order.totalAllIn
  })
  const timeSeriesData = Object.entries(ordersByDate).map(([date, data]) => ({
    date,
    ...data,
  }))

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track and analyze all sourcing orders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton
              data={filteredOrders}
              columns={[
                { key: "orderId", header: "Order ID" },
                { key: "date", header: "Date", format: formatDateExport },
                { key: "status", header: "Status" },
                { key: "totalMSRP", header: "Total MSRP", format: formatCurrencyExport },
                { key: "totalAllIn", header: "All-in Cost", format: formatCurrencyExport },
                { key: "percentOfMSRP", header: "% of MSRP", format: formatPercentExport },
                { key: "totalItems", header: "Items", format: formatNumberExport },
                { key: "totalPallets", header: "Pallets", format: formatNumberExport },
                { key: "carrier", header: "Carrier" },
                { key: "trackingNumber", header: "Tracking #" },
                { key: "eta", header: "ETA", format: formatDateExport },
              ]}
              filename="orders"
            />
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        
      {/* Orders Summary Banner */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total MSRP</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMSRP)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total All-in Cost</p>
              <p className="text-2xl font-bold text-destructive">-{formatCurrency(totalAllIn)}</p>
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
              <p className="text-sm text-muted-foreground mb-1">TOTAL ORDERS</p>
              <p className="text-3xl font-bold text-primary">{formatNumber(filteredOrders.length)}</p>
              <p className="text-xs text-muted-foreground mt-1">in selection</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total MSRP"
            value={formatCurrency(totalMSRP)}
            icon={DollarSign}
          />
          <KPICard
            title="Total All-in"
            value={formatCurrency(totalAllIn)}
            icon={TrendingUp}
          />
          <KPICard
            title="Total Items"
            value={formatNumber(totalItems)}
            icon={Package}
          />
          <KPICard
            title="Total Pallets"
            value={formatNumber(totalPallets)}
            icon={ShoppingCart}
          />
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order ID or ship to..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending Payment">Pending Payment</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Shipped">Shipped</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-card-foreground">
                Order Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percent }) => `${status} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.18 0.02 260)",
                        border: "1px solid oklch(0.25 0.02 260)",
                        borderRadius: "8px",
                        color: "oklch(0.95 0.01 260)"
                      }}
                      labelStyle={{ color: "oklch(0.95 0.01 260)" }}
                      itemStyle={{ color: "oklch(0.85 0.01 260)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-card-foreground">
                MSRP vs All-in by Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                    <XAxis dataKey="date" stroke="oklch(0.65 0.01 260)" fontSize={12} />
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
                        color: "oklch(0.95 0.01 260)"
                      }}
                      labelStyle={{ color: "oklch(0.95 0.01 260)" }}
                      itemStyle={{ color: "oklch(0.85 0.01 260)" }}
                      formatter={(value: number) => [formatCurrency(value), ""]}
                    />
                    <Legend />
                    <Bar dataKey="totalMSRP" name="MSRP" fill="oklch(0.72 0.15 185)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalAllIn" name="All-in" fill="oklch(0.75 0.16 85)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">All Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-2 py-3 text-center w-10"></th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ETA</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pallets</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">All-in Cost</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">MSRP</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">% of MSRP</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Items</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Track</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <>
                      <tr
                        key={order.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-2 py-3 text-center">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            onClick={() => toggleOrderExpand(order.orderId)}
                          >
                            {expandedOrders.includes(order.orderId) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded bg-primary/10 px-2.5 py-1 text-xs font-mono font-semibold text-primary">
                            {order.orderId}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {order.eta
                            ? new Date(order.eta).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "TBD"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{formatNumber(order.totalPallets)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(order.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={order.status}
                            type={
                              order.status === "Delivered"
                                ? "success"
                                : order.status === "Shipped"
                                  ? "info"
                                  : order.status === "Processing"
                                    ? "warning"
                                    : "neutral"
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(order.totalAllIn)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(order.totalMSRP)}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className="text-primary">{order.percentOfMSRP.toFixed(1)}%</span>
                        </td>
                        <td className="px-4 py-3 text-right">{formatNumber(order.totalItems)}</td>
                        <td className="px-4 py-3 text-center">
                          {(order.status === "Shipped" || order.status === "Delivered" || order.trackingNumber) && (
                            <button
                              type="button"
                              onClick={() => setTrackingOrderId(order.orderId)}
                              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                              title="View tracking details"
                            >
                              <Truck className="h-3 w-3" />
                              Track
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedOrders.includes(order.orderId) && (
                        <tr key={`${order.id}-details`} className="bg-muted/20">
                          <td colSpan={11} className="px-4 py-4">
                            {loadingLineItems[order.orderId] ? (
                              <div className="flex items-center justify-center py-8">
                                <p className="text-muted-foreground text-sm">Loading line items...</p>
                              </div>
                            ) : lineItemsCache[order.orderId] && lineItemsCache[order.orderId].length > 0 ? (
                              <div className="ml-6 rounded-md border border-border bg-card overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">UPD-BBY ID</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Category</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Brands</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Condition</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Unit MSRP</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total MSRP</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Unit COGS</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total COGS</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Pallets</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lineItemsCache[order.orderId].map((item, idx) => (
                                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/50">
                                        <td className="px-3 py-2 font-mono text-xs text-primary font-semibold">{item.updBbyId}</td>
                                        <td className="px-3 py-2 text-xs max-w-[200px] truncate" title={item.category}>
                                          {item.category}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-[150px] truncate" title={item.brands}>
                                          {item.brands || "—"}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-muted-foreground">{item.condition || "—"}</td>
                                        <td className="px-3 py-2 text-right text-xs font-medium">{formatNumber(item.itemCount)}</td>
                                        <td className="px-3 py-2 text-right text-xs font-mono text-muted-foreground">
                                          {formatCurrency2(item.msrp / (item.itemCount || 1))}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-mono font-semibold">
                                          {formatCurrency2(item.msrp)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-mono text-muted-foreground">
                                          {formatCurrency2(item.allInPerItem)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-mono">
                                          {formatCurrency2(item.allInCost)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs">
                                          {item.palletCount > 0 ? (
                                            <span title={item.palletIds?.join(", ")} className="cursor-help">
                                              {item.palletCount}
                                            </span>
                                          ) : "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-8">
                                <p className="text-muted-foreground text-sm">No line items found</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tracking Drawer */}
      <TrackingDrawer
        orderId={trackingOrderId}
        open={!!trackingOrderId}
        onOpenChange={(open) => !open && setTrackingOrderId(null)}
      />
    </>
  )
}
