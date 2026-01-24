"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/status-badge"
import { type Order, lineItems, invoices, shipments } from "@/lib/mock-data"
import { Package, FileText, Truck, MapPin, Calendar, DollarSign } from "lucide-react"

interface OrderDetailDrawerProps {
  order: Order | null
  onClose: () => void
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function OrderDetailDrawer({ order, onClose }: OrderDetailDrawerProps) {
  if (!order) return null

  const orderLineItems = lineItems.filter((li) => li.orderId === order.orderId)
  const orderInvoices = invoices.filter((inv) => inv.orderId === order.orderId)
  const orderShipment = shipments.find((s) => s.orderId === order.orderId)

  return (
    <Sheet open={!!order} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl bg-card border-border overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold text-card-foreground">
              {order.orderId}
            </SheetTitle>
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
          </div>
        </SheetHeader>

        {/* Order Summary */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Date
            </div>
            <p className="mt-1 font-medium text-card-foreground">
              {new Date(order.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Ship To
            </div>
            <p className="mt-1 font-medium text-card-foreground">{order.shipTo}</p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total MSRP
            </div>
            <p className="mt-1 font-mono font-medium text-card-foreground">
              {formatCurrency(order.totalMSRP)}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              All-in Cost
            </div>
            <p className="mt-1 font-mono font-medium text-primary">
              {formatCurrency(order.totalAllIn)}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-card-foreground">{order.totalItems}</p>
            <p className="text-xs text-muted-foreground">Items</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-card-foreground">{order.totalPallets}</p>
            <p className="text-xs text-muted-foreground">Pallets</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{order.percentOfMSRP.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">of MSRP</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tracking" className="mt-6">
          <TabsList className="w-full bg-muted">
            <TabsTrigger value="tracking" className="flex-1 gap-2">
              <Truck className="h-4 w-4" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex-1 gap-2">
              <FileText className="h-4 w-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="items" className="flex-1 gap-2">
              <Package className="h-4 w-4" />
              Items
            </TabsTrigger>
          </TabsList>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="mt-4">
            {orderShipment ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Carrier</p>
                    <p className="font-medium text-card-foreground">{orderShipment.carrier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Tracking #</p>
                    <p className="font-mono text-primary">{orderShipment.trackingNumber}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge
                    status={orderShipment.status}
                    type={
                      orderShipment.status === "Delivered"
                        ? "success"
                        : orderShipment.status === "In Transit"
                          ? "info"
                          : "warning"
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    ETA:{" "}
                    {new Date(orderShipment.eta).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {/* Timeline */}
                <div className="relative mt-4 space-y-4 pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                  {orderShipment.events.map((event, index) => (
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Truck className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No tracking information available</p>
              </div>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="mt-4">
            {orderInvoices.length > 0 ? (
              <div className="space-y-3">
                {orderInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="font-mono font-medium text-card-foreground">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium text-card-foreground">
                        {formatCurrency(invoice.amount)}
                      </p>
                      <StatusBadge
                        status={invoice.status}
                        type={
                          invoice.status === "Paid"
                            ? "success"
                            : invoice.status === "Pending"
                              ? "warning"
                              : "danger"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No invoices found</p>
              </div>
            )}
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="mt-4">
            {orderLineItems.length > 0 ? (
              <div className="space-y-3">
                {orderLineItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-card-foreground">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <p className="font-mono text-sm text-primary">
                        {item.percentOfMSRP.toFixed(1)}%
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">MSRP</p>
                        <p className="font-mono text-card-foreground">
                          {formatCurrency(item.msrp)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">All-in</p>
                        <p className="font-mono text-card-foreground">
                          {formatCurrency(item.allInCost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Items</p>
                        <p className="font-mono text-card-foreground">{item.itemsCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">$/Item</p>
                        <p className="font-mono text-card-foreground">
                          ${item.dollarPerItem.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No line items found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
