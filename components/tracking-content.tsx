"use client"

import { useState } from "react"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { shipments, orders, type Shipment } from "@/lib/mock-data"
import { Search, Filter, Truck, Package, Clock, CheckCircle2 } from "lucide-react"

interface ShipmentWithOrder extends Shipment {
  shipTo: string
}

const shipmentsWithOrders: ShipmentWithOrder[] = shipments.map((shipment) => {
  const order = orders.find((o) => o.orderId === shipment.orderId)
  return {
    ...shipment,
    shipTo: order?.shipTo || "Unknown",
  }
})

export function TrackingContent() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [carrierFilter, setCarrierFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedShipment, setSelectedShipment] = useState<ShipmentWithOrder | null>(null)

  const filteredShipments = shipmentsWithOrders.filter((shipment) => {
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter
    const matchesCarrier = carrierFilter === "all" || shipment.carrier === carrierFilter
    const matchesSearch =
      searchQuery === "" ||
      shipment.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesCarrier && matchesSearch
  })

  const deliveredCount = shipments.filter((s) => s.status === "Delivered").length
  const inTransitCount = shipments.filter((s) => s.status === "In Transit").length
  const pendingCount = shipments.filter((s) => s.status === "Pending Pickup").length

  const columns: Column<ShipmentWithOrder>[] = [
    {
      key: "orderId",
      header: "Order ID",
      className: "font-mono text-primary",
    },
    {
      key: "carrier",
      header: "Carrier",
      render: (value) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
            value === "TForce"
              ? "bg-blue-500/15 text-blue-400"
              : "bg-orange-500/15 text-orange-400"
          }`}
        >
          <Truck className="h-3 w-3" />
          {value as string}
        </span>
      ),
    },
    {
      key: "trackingNumber",
      header: "Tracking #",
      className: "font-mono",
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
              : value === "In Transit"
                ? "info"
                : value === "Out for Delivery"
                  ? "warning"
                  : "neutral"
          }
        />
      ),
    },
    {
      key: "shipTo",
      header: "Destination",
    },
    {
      key: "eta",
      header: "ETA",
      render: (value) =>
        new Date(value as string).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      className: "text-muted-foreground",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor shipment status and delivery timelines
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-success/15 p-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{deliveredCount}</p>
              <p className="text-sm text-muted-foreground">Delivered</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/15 p-3">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{inTransitCount}</p>
              <p className="text-sm text-muted-foreground">In Transit</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-warning/15 p-3">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Pickup</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order or tracking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-input border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="In Transit">In Transit</SelectItem>
              <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
              <SelectItem value="Pending Pickup">Pending Pickup</SelectItem>
            </SelectContent>
          </Select>
          <Select value={carrierFilter} onValueChange={setCarrierFilter}>
            <SelectTrigger className="w-[140px] bg-input border-border">
              <SelectValue placeholder="Carrier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Carriers</SelectItem>
              <SelectItem value="TForce">TForce</SelectItem>
              <SelectItem value="XPO">XPO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shipments Table */}
        <div className="lg:col-span-1">
          <DataTable
            columns={columns}
            data={filteredShipments}
            onRowClick={setSelectedShipment}
          />
        </div>

        {/* Timeline Detail */}
        <Card className="border-border bg-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-card-foreground">
              {selectedShipment ? `Timeline: ${selectedShipment.trackingNumber}` : "Select a shipment"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedShipment ? (
              <div className="space-y-6">
                {/* Shipment Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Carrier</p>
                    <p className="mt-1 font-medium text-card-foreground">
                      {selectedShipment.carrier}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Destination</p>
                    <p className="mt-1 font-medium text-card-foreground">
                      {selectedShipment.shipTo}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <StatusBadge
                    status={selectedShipment.status}
                    type={
                      selectedShipment.status === "Delivered"
                        ? "success"
                        : selectedShipment.status === "In Transit"
                          ? "info"
                          : "warning"
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    ETA:{" "}
                    {new Date(selectedShipment.eta).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {/* Timeline */}
                <div className="relative space-y-4 pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                  {selectedShipment.events.map((event, index) => (
                    <div key={index} className="relative">
                      <div
                        className={`absolute -left-4 top-1 h-3 w-3 rounded-full border-2 ${
                          index === 0
                            ? "border-primary bg-primary"
                            : "border-border bg-background"
                        }`}
                      />
                      <p className="font-medium text-card-foreground">{event.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.location} • {event.date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Click on a shipment to view its timeline
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
