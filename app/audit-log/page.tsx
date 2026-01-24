import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/status-badge"
import { Search, User, FileText, Package, CreditCard, Truck } from "lucide-react"

const auditLogs = [
  {
    id: "1",
    timestamp: "2026-01-23 14:32:15",
    user: "admin@company.com",
    action: "Invoice Paid",
    entity: "INV-2026-0120-A",
    entityType: "invoice",
    details: "Marked invoice as paid",
  },
  {
    id: "2",
    timestamp: "2026-01-23 12:15:00",
    user: "ops@company.com",
    action: "Order Updated",
    entity: "ORD-2026-0118",
    entityType: "order",
    details: "Updated tracking status to In Transit",
  },
  {
    id: "3",
    timestamp: "2026-01-23 10:45:30",
    user: "system",
    action: "Data Sync",
    entity: "Supplier API",
    entityType: "sync",
    details: "Synced 2 new orders from supplier",
  },
  {
    id: "4",
    timestamp: "2026-01-22 16:20:00",
    user: "admin@company.com",
    action: "Shipment Delivered",
    entity: "TF-892341",
    entityType: "shipment",
    details: "Shipment marked as delivered at Phoenix Warehouse",
  },
  {
    id: "5",
    timestamp: "2026-01-22 09:00:00",
    user: "system",
    action: "Invoice Created",
    entity: "INV-2026-0118-A",
    entityType: "invoice",
    details: "Auto-generated invoice from order ORD-2026-0118",
  },
  {
    id: "6",
    timestamp: "2026-01-21 14:30:00",
    user: "ops@company.com",
    action: "Order Created",
    entity: "ORD-2026-0120",
    entityType: "order",
    details: "New order imported with 847 items, 12 pallets",
  },
  {
    id: "7",
    timestamp: "2026-01-21 11:15:00",
    user: "admin@company.com",
    action: "Settings Updated",
    entity: "System",
    entityType: "settings",
    details: "Changed default recovery rate from 15% to 18%",
  },
  {
    id: "8",
    timestamp: "2026-01-20 08:00:00",
    user: "system",
    action: "Data Sync",
    entity: "Carrier APIs",
    entityType: "sync",
    details: "Updated tracking for 3 shipments",
  },
]

const getEntityIcon = (type: string) => {
  switch (type) {
    case "order":
      return <Package className="h-4 w-4" />
    case "invoice":
      return <CreditCard className="h-4 w-4" />
    case "shipment":
      return <Truck className="h-4 w-4" />
    case "sync":
      return <FileText className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

const getActionType = (action: string): "success" | "info" | "warning" | "neutral" => {
  if (action.includes("Paid") || action.includes("Delivered")) return "success"
  if (action.includes("Created") || action.includes("Sync")) return "info"
  if (action.includes("Updated")) return "warning"
  return "neutral"
}

export default function AuditLogPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track all system activities and changes
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search audit logs..."
              className="pl-9 bg-input border-border"
            />
          </div>

          {/* Logs */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-card-foreground">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="rounded-lg bg-muted p-2">
                      {getEntityIcon(log.entityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={log.action} type={getActionType(log.action)} />
                        <span className="font-mono text-sm text-primary">{log.entity}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{log.details}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user}
                        </span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
