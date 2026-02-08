"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter } from "lucide-react"

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

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value)

export function TrackingContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [carrierFilter, setCarrierFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.orders) {
          setOrders(data.orders)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch orders:", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading tracking information...</p>
      </div>
    )
  }

  const carriers = [...new Set(orders.map((order) => order.carrier).filter(Boolean))]

  const filteredOrders = orders.filter((order) => {
    const matchesCarrier = carrierFilter === "all" || order.carrier === carrierFilter
    const matchesStatus = statusFilter === "all" || order.trackingStatus === statusFilter
    const matchesSearch =
      searchQuery === "" ||
      order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.carrier?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCarrier && matchesStatus && matchesSearch
  })

  const formatETA = (value: unknown) => {
    if (!value) return "TBD"
    try {
      const date = new Date(value as string)
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return String(value)
    }
  }

  const columns: Column<Order>[] = [
    { key: "orderId", header: "Order ID", className: "font-mono text-primary" },
    {
      key: "eta",
      header: "ETA",
      render: (value) => formatETA(value),
      className: "font-mono",
    },
    {
      key: "totalPallets",
      header: "Pallets",
      render: (value) => formatNumber(value as number),
      className: "font-mono text-center",
    },
    {
      key: "trackingNumber",
      header: "Tracking #",
      render: (value) => value || "N/A",
      className: "font-mono",
    },
    {
      key: "carrier",
      header: "Carrier",
      render: (value) => value || "N/A",
    },
    {
      key: "trackingStatus",
      header: "Status",
      render: (value) => (
        <StatusBadge
          status={value as string}
          type={
            value === "Delivered"
              ? "success"
              : value === "In Transit"
                ? "info"
                : value === "Out for Delivery"
                  ? "warning"
                  : "neutral"
          }
        />
      ),
    },
    { key: "shipTo", header: "Destination" },
    {
      key: "totalItems",
      header: "Items",
      render: (value) => formatNumber(value as number),
      className: "text-right",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Shipment Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track all shipments in real-time
        </p>
      </div>

      
      {/* Tracking Summary Banner */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Shipments</p>
              <p className="text-2xl font-bold text-foreground">{filteredOrders.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">In Transit</p>
              <p className="text-2xl font-bold text-blue-400">{filteredOrders.filter(o => o.trackingStatus === "In Transit").length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Pallets</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(filteredOrders.reduce((sum, o) => sum + o.totalPallets, 0))}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Items</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(filteredOrders.reduce((sum, o) => sum + o.totalItems, 0))}</p>
            </div>
            <div className="text-center border-l-2 border-primary pl-6">
              <p className="text-sm text-muted-foreground mb-1">DELIVERED</p>
              <p className="text-3xl font-bold text-primary">{filteredOrders.filter(o => o.trackingStatus === "Delivered").length}</p>
              <p className="text-xs text-muted-foreground mt-1">completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tracking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={carrierFilter} onValueChange={setCarrierFilter}>
            <SelectTrigger className="w-[160px] bg-input border-border">
              <SelectValue placeholder="Carrier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Carriers</SelectItem>
              {carriers.map((carrier) => (
                <SelectItem key={carrier} value={carrier!}>
                  {carrier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-input border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending Pickup">Pending Pickup</SelectItem>
              <SelectItem value="In Transit">In Transit</SelectItem>
              <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{filteredOrders.length}</span> of{" "}
        <span className="font-medium text-foreground">{orders.length}</span> shipments
      </div>

      <DataTable columns={columns} data={filteredOrders} />
    </div>
  )
}
