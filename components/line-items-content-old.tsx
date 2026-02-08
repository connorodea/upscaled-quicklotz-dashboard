"use client"

import { useState, useEffect } from "react"
import { DataTable, type Column } from "@/components/data-table"
import { KPICard } from "@/components/kpi-card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter } from "lucide-react"

interface LineItem {
  id: string
  orderId: string
  category: string
  title: string
  msrp: number
  allInCost: number
  itemsCount: number
  palletCount: number
  percentOfMSRP: number
  dollarPerItem: number
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

export function LineItemsContent() {
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [orderFilter, setOrderFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch("/api/line-items")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.lineItems) {
          setLineItems(data.lineItems)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch line items:", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading line items...</p>
      </div>
    )
  }

  const categories = [...new Set(lineItems.map((item) => item.category))]
  const orderIds = [...new Set(lineItems.map((item) => item.orderId))]

  const filteredItems = lineItems.filter((item) => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    const matchesOrder = orderFilter === "all" || item.orderId === orderFilter
    const matchesSearch =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesOrder && matchesSearch
  })

  const totalMSRP = filteredItems.reduce((sum, item) => sum + item.msrp, 0)
  const totalAllIn = filteredItems.reduce((sum, item) => sum + item.allInCost, 0)
  const avgPercentOfMSRP = totalMSRP > 0 ? (totalAllIn / totalMSRP) * 100 : 0

  const columns: Column<LineItem>[] = [
    { key: "category", header: "Category", className: "font-medium" },
    {
      key: "title",
      header: "Title",
      className: "max-w-[300px] truncate",
    },
    {
      key: "msrp",
      header: "MSRP",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "allInCost",
      header: "All-in Cost",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "itemsCount",
      header: "Items",
      render: (value) => formatNumber(value as number),
      className: "text-right",
    },
    {
      key: "palletCount",
      header: "Pallets",
      render: (value) => formatNumber(value as number),
      className: "text-right",
    },
    {
      key: "percentOfMSRP",
      header: "% of MSRP",
      render: (value) => (
        <span className="text-primary">{(value as number).toFixed(1)}%</span>
      ),
      className: "font-mono text-right",
    },
    {
      key: "dollarPerItem",
      header: "$ / Item",
      render: (value) => `$${(value as number).toFixed(2)}`,
      className: "font-mono text-right",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Line Items</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse and analyze all items across orders
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KPICard
          title="Total MSRP"
          value={formatCurrency(totalMSRP)}
        />
        <KPICard
          title="Total All-in"
          value={formatCurrency(totalAllIn)}
        />
        <KPICard
          title="Avg % of MSRP"
          value={`${avgPercentOfMSRP.toFixed(1)}%`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] bg-input border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={orderFilter} onValueChange={setOrderFilter}>
            <SelectTrigger className="w-[180px] bg-input border-border">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              {orderIds.map((id) => (
                <SelectItem key={id} value={id}>
                  {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{filteredItems.length}</span> of{" "}
        <span className="font-medium text-foreground">{lineItems.length}</span> items
      </div>

      <DataTable columns={columns} data={filteredItems} />
    </div>
  )
}
