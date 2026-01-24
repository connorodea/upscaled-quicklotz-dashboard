"use client"

import { useState } from "react"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { OrderDetailDrawer } from "@/components/order-detail-drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { orders, type Order } from "@/lib/mock-data"
import { Search, Filter, Download } from "lucide-react"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value)

export function OrdersContent() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [trackingFilter, setTrackingFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesTracking = trackingFilter === "all" || order.trackingStatus === trackingFilter
    const matchesSearch =
      searchQuery === "" ||
      order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipTo.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesTracking && matchesSearch
  })

  const columns: Column<Order>[] = [
    {
      key: "date",
      header: "Date",
      render: (value) =>
        new Date(value as string).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      className: "text-muted-foreground",
    },
    { key: "orderId", header: "Order ID", className: "font-mono text-primary" },
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
    { key: "shipTo", header: "Ship To" },
    {
      key: "totalAllIn",
      header: "All-in Cost",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "totalMSRP",
      header: "Total MSRP",
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
      key: "totalItems",
      header: "Items",
      render: (value) => formatNumber(value as number),
      className: "text-right",
    },
    {
      key: "totalPallets",
      header: "Pallets",
      render: (value) => formatNumber(value as number),
      className: "text-right",
    },
    {
      key: "trackingStatus",
      header: "Tracking",
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
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track all your sourcing orders
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-input border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Shipped">Shipped</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={trackingFilter} onValueChange={setTrackingFilter}>
            <SelectTrigger className="w-[180px] bg-input border-border">
              <SelectValue placeholder="Tracking Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracking</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="In Transit">In Transit</SelectItem>
              <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
              <SelectItem value="Pending Pickup">Pending Pickup</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-6 text-sm">
        <span className="text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredOrders.length}</span> of{" "}
          <span className="font-medium text-foreground">{orders.length}</span> orders
        </span>
        <span className="text-muted-foreground">
          Total MSRP:{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(filteredOrders.reduce((sum, o) => sum + o.totalMSRP, 0))}
          </span>
        </span>
        <span className="text-muted-foreground">
          Total All-in:{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(filteredOrders.reduce((sum, o) => sum + o.totalAllIn, 0))}
          </span>
        </span>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredOrders}
        onRowClick={setSelectedOrder}
      />

      {/* Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}
