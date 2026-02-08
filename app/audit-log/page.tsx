"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/status-badge"
import { Search, User, FileText, Package, CreditCard, Truck } from "lucide-react"

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  entity: string
  entityType: string
  details: string
}

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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetch("/api/audit-log")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.auditLogs) {
          setAuditLogs(data.auditLogs)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch audit logs:", err)
        setLoading(false)
      })
  }, [])

  const filteredLogs = auditLogs.filter((log) =>
    Object.values(log).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <main className="pt-16 md:pt-0 md:ml-64 min-h-screen p-3 sm:p-4 md:p-6 overflow-x-hidden">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Loading audit logs...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pt-16 md:pt-0 md:ml-64 min-h-screen p-3 sm:p-4 md:p-6 overflow-x-hidden">
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Logs */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-card-foreground">
                Recent Activity ({filteredLogs.length} entries)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {searchTerm ? "No logs found matching your search." : "No audit logs available."}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredLogs.map((log) => (
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
