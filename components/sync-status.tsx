"use client"

import { useState, useEffect } from "react"
import { RefreshCw, CheckCircle, AlertCircle, Clock, Database } from "lucide-react"
import { cn } from "@/lib/utils"

interface SyncStatusData {
  lastSync: string | null
  ordersCount: number
  invoicesCount: number
  lineItemsCount: number
  status: "healthy" | "stale" | "error"
  message: string
}

interface SyncStatusProps {
  className?: string
  showDetails?: boolean
}

export function SyncStatus({ className, showDetails = false }: SyncStatusProps) {
  const [status, setStatus] = useState<SyncStatusData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/sync-status")
      const data = await response.json()
      if (data.success) {
        setStatus(data)
      }
    } catch (error) {
      console.error("Failed to fetch sync status:", error)
      setStatus({
        lastSync: null,
        ordersCount: 0,
        invoicesCount: 0,
        lineItemsCount: 0,
        status: "error",
        message: "Failed to connect",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Checking...</span>
      </div>
    )
  }

  if (!status) {
    return null
  }

  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      dotColor: "bg-green-500",
    },
    stale: {
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      dotColor: "bg-yellow-500",
    },
    error: {
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      dotColor: "bg-red-500",
    },
  }

  const config = statusConfig[status.status]
  const Icon = config.icon

  if (showDetails) {
    return (
      <div className={cn("rounded-md p-3", config.bgColor, className)}>
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("h-2 w-2 rounded-full animate-pulse", config.dotColor)} />
          <span className={cn("text-xs font-medium", config.color)}>
            {status.message}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            <span>{status.ordersCount} orders</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{status.invoicesCount} invoices</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{status.lineItemsCount} manifests</span>
          </div>
        </div>
        {status.lastSync && (
          <p className="mt-2 text-xs text-muted-foreground">
            Last sync: {new Date(status.lastSync).toLocaleString()}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("h-2 w-2 rounded-full", config.dotColor)} />
      <span className="text-xs text-muted-foreground">{status.message}</span>
    </div>
  )
}

// Compact version for the sidebar
export function SyncStatusCompact() {
  const [status, setStatus] = useState<SyncStatusData | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/sync-status")
        const data = await response.json()
        if (data.success) {
          setStatus(data)
        }
      } catch (error) {
        console.error("Failed to fetch sync status:", error)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!status) {
    return (
      <div className="rounded-md bg-sidebar-accent p-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-2 w-2 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Checking sync...</span>
        </div>
      </div>
    )
  }

  const dotColor =
    status.status === "healthy"
      ? "bg-green-500"
      : status.status === "stale"
        ? "bg-yellow-500"
        : "bg-red-500"

  return (
    <div className="rounded-md bg-sidebar-accent p-3">
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full", dotColor)} />
        <span className="text-xs text-muted-foreground">Data synced</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{status.message}</p>
    </div>
  )
}
