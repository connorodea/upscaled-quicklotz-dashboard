"use client"

import { useState, useEffect, useMemo } from "react"
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
import {
  Search,
  Download,
  RefreshCw,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  Barcode,
  Layers,
  List,
} from "lucide-react"
import { ProjectionsSkeleton } from "@/components/skeletons"

// ---- Lot-level types (existing) ----
interface LineItem {
  orderId: string
  orderDate: string
  weekSourced: string
  orderStatus: string
  shipTo: string
  updBbyId: string
  title: string
  category: string
  brands: string
  condition: string
  msrp: number
  allInCost: number
  itemCount: number
  allInPerItem: number
  palletIds: string[]
  palletCount: number
}

interface OrderGroup {
  orderId: string
  orderDate: string
  weekSourced: string
  orderStatus: string
  shipTo: string
  totalItems: number
  totalQuantity: number
  totalMSRP: number
  totalCOGS: number
  totalPallets: number
  lineItems: LineItem[]
}

// ---- Individual item types (new) ----
interface ManifestItem {
  id: number
  order_id: string
  listing_id: string
  listing_title: string
  category: string
  product_name: string
  upc: string
  asin: string
  quantity: number
  unit_retail: number
  total_retail: number
  order_date: string
  line_item_brands: string
  allocated_cogs_per_unit: number
}

interface ManifestSummary {
  totalUniqueUPCs: number
  totalItems: number
  totalMSRP: number
  totalAllocatedCOGS: number
  categoryBreakdown: { category: string; itemCount: number; totalMSRP: number; uniqueProducts: number }[]
  topProducts: { productName: string; upc: string; totalQuantity: number; totalMSRP: number; orderCount: number }[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value)

export function MasterManifestContent() {
  // View toggle
  const [viewMode, setViewMode] = useState<"lots" | "items">("items")

  // Lot-level state (existing)
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Individual items state (new)
  const [manifestItems, setManifestItems] = useState<ManifestItem[]>([])
  const [manifestSummary, setManifestSummary] = useState<ManifestSummary | null>(null)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsLoaded, setItemsLoaded] = useState(false)
  const [itemPage, setItemPage] = useState(0)
  const ITEMS_PER_PAGE = 100

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    )
  }

  const fetchLotData = () => {
    setRefreshing(true)
    fetch("/api/master-manifest")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.manifestItems) {
          const grouped = data.manifestItems.reduce((acc: Record<string, any>, item: LineItem) => {
            if (!acc[item.orderId]) {
              acc[item.orderId] = {
                orderId: item.orderId,
                orderDate: item.orderDate,
                weekSourced: item.weekSourced || "",
                orderStatus: item.orderStatus,
                shipTo: item.shipTo,
                totalItems: 0,
                totalQuantity: 0,
                totalMSRP: 0,
                totalCOGS: 0,
                totalPallets: 0,
                lineItems: []
              }
            }
            acc[item.orderId].totalItems += 1
            acc[item.orderId].totalQuantity += item.itemCount || 0
            acc[item.orderId].totalMSRP += item.msrp || 0
            acc[item.orderId].totalCOGS += item.allInCost || 0
            acc[item.orderId].totalPallets += item.palletCount || 0
            acc[item.orderId].lineItems.push(item)
            return acc
          }, {})
          setOrderGroups(Object.values(grouped))
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

  const fetchItemData = () => {
    setItemsLoading(true)
    fetch("/api/master-manifest-items")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setManifestItems(data.items || [])
          setManifestSummary(data.summary || null)
          setItemsLoaded(true)
        }
        setItemsLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch manifest items:", err)
        setItemsLoading(false)
      })
  }

  useEffect(() => {
    fetchLotData()
  }, [])

  useEffect(() => {
    if (viewMode === "items" && !itemsLoaded && !itemsLoading) {
      fetchItemData()
    }
  }, [viewMode, itemsLoaded, itemsLoading])

  // ---- Lot-level computed values ----
  const totalOrders = orderGroups.length
  const totalLineItems = orderGroups.reduce((sum, og) => sum + og.totalItems, 0)
  const totalQuantity = orderGroups.reduce((sum, og) => sum + og.totalQuantity, 0)
  const totalMSRP = orderGroups.reduce((sum, og) => sum + og.totalMSRP, 0)
  const totalCOGS = orderGroups.reduce((sum, og) => sum + og.totalCOGS, 0)

  const uniqueCategories = Array.from(
    new Set(orderGroups.flatMap(og => og.lineItems.map(item => item.category)))
  ).sort()

  const filteredOrders = orderGroups.filter(orderGroup => {
    const categoryMatch = categoryFilter === "all" ||
      orderGroup.lineItems.some(item => item.category === categoryFilter)
    const searchMatch = searchQuery === "" ||
      orderGroup.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orderGroup.lineItems.some(item =>
        item.updBbyId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brands?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.palletIds?.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    return categoryMatch && searchMatch
  })

  // ---- Individual items computed values ----
  const itemCategories = useMemo(() => {
    const cats = new Set<string>()
    manifestItems.forEach(i => { if (i.category) cats.add(i.category) })
    return Array.from(cats).sort()
  }, [manifestItems])

  const filteredItems = useMemo(() => {
    return manifestItems.filter(item => {
      const catMatch = categoryFilter === "all" || item.category === categoryFilter
      const searchMatch = searchQuery === "" ||
        item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.upc?.includes(searchQuery) ||
        item.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.listing_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.line_item_brands?.toLowerCase().includes(searchQuery.toLowerCase())
      return catMatch && searchMatch
    })
  }, [manifestItems, categoryFilter, searchQuery])

  const pagedItems = useMemo(() => {
    const start = itemPage * ITEMS_PER_PAGE
    return filteredItems.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredItems, itemPage])

  const totalItemPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)

  // ---- Export CSV ----
  const exportToCSV = () => {
    if (viewMode === "items") {
      const headers = [
        "Order ID", "Order Date", "Listing ID", "Category", "Product Name",
        "UPC", "ASIN", "Quantity", "Unit Retail", "Total Retail",
        "Brands", "Allocated COGS/Unit"
      ]
      const rows = filteredItems.map(item => [
        item.order_id, item.order_date, item.listing_id, item.category,
        item.product_name, item.upc, item.asin, item.quantity,
        item.unit_retail?.toFixed(2), item.total_retail?.toFixed(2),
        item.line_item_brands, item.allocated_cogs_per_unit?.toFixed(2)
      ])
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell ?? ""}"`).join(","))
      ].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `master-manifest-items-${new Date().toISOString().split("T")[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } else {
      const headers = [
        "Order ID", "Order Date", "Week Sourced", "UPD-BBY ID", "Category",
        "Brands", "Condition", "Quantity", "Total MSRP", "Unit MSRP",
        "Total COGS", "Unit COGS", "Pallet Count", "Pallet IDs", "Order Status", "Ship To"
      ]
      const rows = filteredOrders.flatMap(order =>
        order.lineItems.map(item => [
          order.orderId, order.orderDate, order.weekSourced || "",
          item.updBbyId, item.category, item.brands || "", item.condition || "",
          item.itemCount, item.msrp.toFixed(2),
          (item.msrp / (item.itemCount || 1)).toFixed(2),
          item.allInCost.toFixed(2), item.allInPerItem.toFixed(2),
          item.palletCount, item.palletIds?.join("; ") || "",
          order.orderStatus, order.shipTo
        ])
      )
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `master-manifest-lots-${new Date().toISOString().split("T")[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return <ProjectionsSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Master Manifest</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {viewMode === "items"
              ? "Individual products with UPCs from all order manifests"
              : "Lot-level order inventory with quantities and totals"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <button
            onClick={() => { viewMode === "items" ? fetchItemData() : fetchLotData() }}
            disabled={refreshing || itemsLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${(refreshing || itemsLoading) ? "animate-spin" : ""}`} />
            {(refreshing || itemsLoading) ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setViewMode("items")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === "items"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Barcode className="h-4 w-4" />
          Individual Items ({manifestSummary ? formatNumber(manifestSummary.totalItems) : "..."})
        </button>
        <button
          onClick={() => setViewMode("lots")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === "lots"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Lot View ({totalOrders} orders)
        </button>
      </div>

      {/* KPI Cards - different for each view */}
      {viewMode === "items" && manifestSummary ? (
        <>
          {/* Items Summary Banner */}
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="py-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Unique UPCs</p>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(manifestSummary.totalUniqueUPCs)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Items</p>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(manifestSummary.totalItems)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total MSRP</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(manifestSummary.totalMSRP)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total COGS</p>
                  <p className="text-2xl font-bold text-destructive">-{formatCurrency(manifestSummary.totalAllocatedCOGS)}</p>
                </div>
                <div className="text-center border-l-2 border-primary pl-6">
                  <p className="text-sm text-muted-foreground mb-1">PROFIT @ 25%</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency((manifestSummary.totalMSRP * 0.25) - manifestSummary.totalAllocatedCOGS)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{manifestItems.length} rows</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Unique UPCs"
            value={formatNumber(manifestSummary.totalUniqueUPCs)}
            icon={Barcode}
          />
          <KPICard
            title="Total Items"
            value={formatNumber(manifestSummary.totalItems)}
            icon={ShoppingCart}
          />
          <KPICard
            title="Product Rows"
            value={formatNumber(manifestItems.length)}
            icon={List}
          />
          <KPICard
            title="Total MSRP"
            value={formatCurrency(manifestSummary.totalMSRP)}
            icon={DollarSign}
          />
          <KPICard
            title="Total Allocated COGS"
            value={formatCurrency(manifestSummary.totalAllocatedCOGS)}
            icon={TrendingUp}
          />
        </div>
        </>
      ) : viewMode === "lots" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Orders" value={formatNumber(totalOrders)} icon={Package} />
          <KPICard title="Total Units" value={formatNumber(totalQuantity)} icon={ShoppingCart} />
          <KPICard title="Total MSRP" value={formatCurrency(totalMSRP)} icon={DollarSign} />
          <KPICard title="Total COGS" value={formatCurrency(totalCOGS)} icon={TrendingUp} />
        </div>
      ) : null}

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={viewMode === "items"
              ? "Search by product name, UPC, order ID, category, or brand..."
              : "Search by order ID, category, brands, or pallet ID..."}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setItemPage(0) }}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setItemPage(0) }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(viewMode === "items" ? itemCategories : uniqueCategories).map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ========== INDIVIDUAL ITEMS VIEW ========== */}
      {viewMode === "items" && (
        <>
          {itemsLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <p className="text-muted-foreground">Loading individual items...</p>
            </div>
          ) : (
            <>
              {/* Category Breakdown */}
              {manifestSummary && manifestSummary.categoryBreakdown.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground text-sm">Category Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {manifestSummary.categoryBreakdown.slice(0, 12).map(cat => (
                        <button
                          key={cat.category}
                          onClick={() => {
                            setCategoryFilter(categoryFilter === cat.category ? "all" : cat.category)
                            setItemPage(0)
                          }}
                          className={`rounded-lg border p-3 text-left transition-colors ${
                            categoryFilter === cat.category
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:bg-muted/50"
                          }`}
                        >
                          <p className="text-xs font-medium text-foreground truncate">{cat.category}</p>
                          <p className="text-lg font-bold text-foreground">{formatNumber(cat.itemCount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(cat.totalMSRP)} | {cat.uniqueProducts} products
                          </p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items Table */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground">
                      Products ({formatNumber(filteredItems.length)})
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Page {itemPage + 1} of {totalItemPages || 1}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Product Name</th>
                          <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">UPC</th>
                          <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Category</th>
                          <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Order</th>
                          <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Listing</th>
                          <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Qty</th>
                          <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Unit Retail</th>
                          <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Total Retail</th>
                          <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">COGS/Unit</th>
                          <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Brands</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedItems.map((item) => (
                          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                            <td className="px-3 py-2 text-xs max-w-[250px] truncate font-medium" title={item.product_name}>
                              {item.product_name}
                            </td>
                            <td className="px-3 py-2 text-xs font-mono text-primary">
                              {item.upc || "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px] truncate" title={item.category}>
                              {item.category || "—"}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary">
                                {item.order_id}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                              {item.listing_id || "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-medium">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-xs font-mono">
                              {formatCurrency(item.unit_retail || 0)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-mono font-semibold">
                              {formatCurrency(item.total_retail || 0)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-mono text-muted-foreground">
                              {item.allocated_cogs_per_unit > 0 ? formatCurrency(item.allocated_cogs_per_unit) : "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px] truncate" title={item.line_item_brands}>
                              {item.line_item_brands || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalItemPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-muted-foreground">
                        Showing {itemPage * ITEMS_PER_PAGE + 1}–{Math.min((itemPage + 1) * ITEMS_PER_PAGE, filteredItems.length)} of {formatNumber(filteredItems.length)}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setItemPage(p => Math.max(0, p - 1))}
                          disabled={itemPage === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setItemPage(p => Math.min(totalItemPages - 1, p + 1))}
                          disabled={itemPage >= totalItemPages - 1}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Products */}
              {manifestSummary && manifestSummary.topProducts.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground text-sm">Top 20 Products by Quantity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Product</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">UPC</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total Qty</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total MSRP</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Orders</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manifestSummary.topProducts.map((p, i) => (
                            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50">
                              <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2 text-xs font-medium max-w-[300px] truncate" title={p.productName}>
                                {p.productName}
                              </td>
                              <td className="px-3 py-2 text-xs font-mono text-primary">{p.upc || "—"}</td>
                              <td className="px-3 py-2 text-right text-xs font-bold">{formatNumber(p.totalQuantity)}</td>
                              <td className="px-3 py-2 text-right text-xs font-mono">{formatCurrency(p.totalMSRP)}</td>
                              <td className="px-3 py-2 text-right text-xs">{p.orderCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* ========== LOT VIEW (existing) ========== */}
      {viewMode === "lots" && (
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Week</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Line Items</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Units</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total MSRP</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total COGS</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pallets</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ship To</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <>
                      <tr
                        key={order.orderId}
                        className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toggleOrderExpand(order.orderId)}
                      >
                        <td className="px-2 py-3 text-center">
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
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
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(order.orderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">{order.weekSourced || "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={order.orderStatus}
                            type={
                              order.orderStatus === "Delivered" ? "success" :
                              order.orderStatus === "Shipped" ? "info" :
                              order.orderStatus === "Processing" ? "warning" : "neutral"
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{order.totalItems}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatNumber(order.totalQuantity)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(order.totalMSRP)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(order.totalCOGS)}</td>
                        <td className="px-4 py-3 text-right">{order.totalPallets || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-sm max-w-[150px] truncate">{order.shipTo}</td>
                      </tr>
                      {expandedOrders.includes(order.orderId) && (
                        <tr key={`${order.orderId}-details`} className="bg-muted/20">
                          <td colSpan={11} className="px-4 py-4">
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
                                  {order.lineItems.map((item, idx) => (
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
                                        {formatCurrency(item.msrp / (item.itemCount || 1))}
                                      </td>
                                      <td className="px-3 py-2 text-right text-xs font-mono font-semibold">
                                        {formatCurrency(item.msrp)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-xs font-mono text-muted-foreground">
                                        {formatCurrency(item.allInPerItem)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-xs font-mono">
                                        {formatCurrency(item.allInCost)}
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
      )}
    </div>
  )
}
