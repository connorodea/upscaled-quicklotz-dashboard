"use client"

import { useState, useEffect } from "react"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { KPICard } from "@/components/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Download, RefreshCw, Package, DollarSign, TrendingUp, ShoppingCart } from "lucide-react"
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

interface ManifestItem {
  orderId: string
  orderDate: string
  weekSourced: string
  weekMsrpPercent: number
  orderStatus: string
  shipTo: string
  lineItemId: number
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
  allInPercentMsrp: number
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

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value)

const STATUS_COLORS = [
  "oklch(0.72 0.15 185)",
  "oklch(0.70 0.18 160)",
  "oklch(0.75 0.16 85)",
  "oklch(0.65 0.20 30)",
]

export function LineItemsContent() {
  const [items, setItems] = useState<ManifestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [conditionFilter, setConditionFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchData = () => {
    setRefreshing(true)
    fetch("/api/master-manifest")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.manifestItems) {
          setItems(data.manifestItems)
        }
        setLoading(false)
        setRefreshing(false)
      })
      .catch((err) => {
        console.error("Failed to fetch master manifest:", err)
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const exportToCSV = () => {
    const headers = [
      "Order ID",
      "Order Date",
      "Week Sourced",
      "UPD-BBY ID",
      "Title",
      "Category",
      "Brands",
      "Condition",
      "MSRP",
      "Lot Price",
      "Allocated Shipping",
      "All-in Cost",
      "Item Count",
      "All-in % of MSRP",
      "All-in Per Item",
      "Pallet Count",
      "Pallet IDs",
      "Order Status",
      "Ship To"
    ]

    const csvData = filteredItems.map(item => [
      item.orderId,
      item.orderDate,
      item.weekSourced || "",
      item.updBbyId,
      `"${item.title.replace(/"/g, '')}"`,
      item.category,
      item.brands || "",
      item.condition,
      item.msrp.toFixed(2),
      item.lotPrice.toFixed(2),
      item.allocatedShipping.toFixed(2),
      item.allInCost.toFixed(2),
      item.itemCount,
      (item.allInPercentMsrp * 100).toFixed(2) + "%",
      item.allInPerItem.toFixed(2),
      item.palletCount,
      `"${(item.palletIds || []).join(", ")}"`,
      item.orderStatus,
      `"${item.shipTo}"`
    ])

    const csv = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `master-manifest-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading master manifest...</p>
      </div>
    )
  }

  const filteredItems = items.filter((item) => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    const matchesCondition = conditionFilter === "all" || item.condition === conditionFilter
    const matchesSearch =
      searchQuery === "" ||
      item.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.updBbyId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.palletIds || []).some(pid => pid.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesCondition && matchesSearch
  })

  // Calculate metrics
  const totalMSRP = filteredItems.reduce((sum, item) => sum + item.msrp, 0)
  const totalAllIn = filteredItems.reduce((sum, item) => sum + item.allInCost, 0)
  const totalItems = filteredItems.reduce((sum, item) => sum + item.itemCount, 0)
  const totalPallets = filteredItems.reduce((sum, item) => sum + item.palletCount, 0)
  const avgPercentOfMSRP = totalMSRP > 0 ? (totalAllIn / totalMSRP) * 100 : 0

  // Category breakdown
  const categoryMap: Record<string, { totalMSRP: number; totalAllIn: number; count: number }> = {}
  filteredItems.forEach(item => {
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = { totalMSRP: 0, totalAllIn: 0, count: 0 }
    }
    categoryMap[item.category].totalMSRP += item.msrp
    categoryMap[item.category].totalAllIn += item.allInCost
    categoryMap[item.category].count++
  })
  const categoryData = Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      ...data,
    }))
    .sort((a, b) => b.totalMSRP - a.totalMSRP)
    .slice(0, 10)

  // Condition breakdown
  const conditionMap: Record<string, number> = {}
  filteredItems.forEach(item => {
    conditionMap[item.condition] = (conditionMap[item.condition] || 0) + 1
  })
  const conditionData = Object.entries(conditionMap).map(([condition, count]) => ({
    condition,
    count,
  }))

  const uniqueCategories = Array.from(new Set(items.map(item => item.category))).sort()
  const uniqueConditions = Array.from(new Set(items.map(item => item.condition))).sort()

  const columns: Column<ManifestItem>[] = [
    {
      key: "orderDate",
      header: "Date",
      render: (value) => new Date(value as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      className: "text-muted-foreground text-sm",
    },
    { key: "orderId", header: "Order ID", className: "font-mono text-xs" },
    { key: "updBbyId", header: "UPD-BBY ID", className: "font-mono text-primary text-xs" },
    { key: "category", header: "Category", className: "text-sm max-w-[150px] truncate" },
    { key: "title", header: "Title", className: "text-sm max-w-[250px] truncate" },
    { key: "condition", header: "Condition", className: "text-sm" },
    {
      key: "msrp",
      header: "MSRP",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right text-sm",
    },
    {
      key: "allInCost",
      header: "All-in",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right text-sm",
    },
    {
      key: "itemCount",
      header: "Items",
      render: (value) => formatNumber(value as number),
      className: "text-right text-sm",
    },
    {
      key: "palletCount",
      header: "Pallets",
      render: (value) => formatNumber(value as number),
      className: "text-right text-sm",
    },
    {
      key: "orderStatus",
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
          <h1 className="text-2xl font-bold text-foreground">Line Items</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Detailed order line items with COGS and pallet tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      
      {/* Line Items Summary Banner */}
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
              <p className="text-sm text-muted-foreground mb-1">PROFIT @ 25%</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency((totalMSRP * 0.25) - totalAllIn)}</p>
              <p className="text-xs text-muted-foreground mt-1">{filteredItems.length} line items</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 lg:grid-cols-4 gap-4">
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
            placeholder="Search by order ID, UPD-BBY ID, title, or pallet ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {uniqueConditions.map(cond => (
              <SelectItem key={cond} value={cond}>{cond}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              Top Categories by MSRP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
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
                  <Bar dataKey="totalMSRP" name="MSRP" fill="oklch(0.72 0.15 185)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="totalAllIn" name="All-in" fill="oklch(0.75 0.16 85)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-card-foreground">
              Inventory by Condition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conditionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ condition, percent }) => `${condition} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {conditionData.map((_, index) => (
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
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">All Items ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredItems} />
        </CardContent>
      </Card>
    </div>
  )
}
