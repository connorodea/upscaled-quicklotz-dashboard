"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { KPICard } from "@/components/kpi-card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, Loader2 } from "lucide-react"
import { InvoicesSkeleton } from "@/components/skeletons"
import { ExportButton } from "@/components/export-button"
import { DateRangePicker, useDateRange, type DateRange } from "@/components/date-range-picker"
import { formatCurrencyExport, formatDateExport } from "@/lib/export"
import { Button } from "@/components/ui/button"

interface Invoice {
  id: string
  invoiceNumber: string
  orderId: string
  customerID: string
  invoiceDate: string
  dueDate: string
  totalDue: number
  paymentsApplied: number
  status: string
  sourceFile: string
  eta: string | null
  palletCount: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatDate = (dateStr: string) => {
  try {
    const [month, day, year] = dateStr.split('/')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}


const formatETA = (eta: string | null) => {
  if (!eta) return "—"
  try {
    const date = new Date(eta)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return eta
  }
}

export function InvoicesContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const { dateRange, setDateRange } = useDateRange()
  const [updatingInvoice, setUpdatingInvoice] = useState<string | null>(null)

  const fetchInvoices = () => {
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.invoices) {
          setInvoices(data.invoices)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch invoices:", err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const toggleInvoiceStatus = async (invoiceNumber: string, currentStatus: string) => {
    const newStatus = currentStatus === "Paid" ? "Unpaid" : "Paid"
    setUpdatingInvoice(invoiceNumber)

    try {
      const response = await fetch("/api/invoices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceNumber,
          status: newStatus,
        }),
      })

      if (response.ok) {
        // Update local state
        setInvoices(prev =>
          prev.map(inv =>
            inv.invoiceNumber === invoiceNumber
              ? { ...inv, status: newStatus, paymentsApplied: newStatus === "Paid" ? inv.totalDue : 0 }
              : inv
          )
        )
      } else {
        console.error("Failed to update invoice status")
      }
    } catch (error) {
      console.error("Error updating invoice status:", error)
    } finally {
      setUpdatingInvoice(null)
    }
  }

  if (loading) {
    return <InvoicesSkeleton />
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesSearch =
      searchQuery === "" ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.orderId.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Date filtering
    if (dateRange.from || dateRange.to) {
      const invoiceDate = new Date(invoice.invoiceDate.split('/').reverse().join('-'))
      if (dateRange.from && invoiceDate < dateRange.from) return false
      if (dateRange.to) {
        const endOfDay = new Date(dateRange.to)
        endOfDay.setHours(23, 59, 59, 999)
        if (invoiceDate > endOfDay) return false
      }
    }
    
    return matchesStatus && matchesSearch
  })

  // Calculate totals
  const totalDue = filteredInvoices.reduce((sum, inv) => sum + inv.totalDue, 0)
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.paymentsApplied, 0)
  const totalOutstanding = totalDue - totalPaid
  const paidCount = filteredInvoices.filter(inv => inv.status.toLowerCase() === 'paid').length
  const unpaidCount = filteredInvoices.filter(inv => inv.status.toLowerCase() === 'unpaid').length

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      className: "font-mono text-primary",
    },
    {
      key: "orderId",
      header: "Order ID",
      className: "font-mono",
    },
    {
      key: "eta",
      header: "ETA",
      render: (value) => formatETA(value as string | null),
      className: "font-mono",
    },
    {
      key: "palletCount",
      header: "Pallets",
      render: (value) => (value as number) > 0 ? String(value) : "—",
      className: "font-mono text-center",
    },
    {
      key: "invoiceDate",
      header: "Invoice Date",
      render: (value) => formatDate(value as string),
      className: "text-muted-foreground",
    },
    {
      key: "totalDue",
      header: "Total Due",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "paymentsApplied",
      header: "Paid",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "status",
      header: "Status",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          {updatingInvoice === row.invoiceNumber ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={value === "Paid"}
              onCheckedChange={() => toggleInvoiceStatus(row.invoiceNumber, value as string)}
              className="data-[state=checked]:bg-green-600"
            />
          )}
          <StatusBadge
            status={value as string}
            type={value === "Paid" ? "success" : "warning"}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        </div>
        <ExportButton
            data={filteredInvoices}
            columns={[
              { key: "invoiceNumber", header: "Invoice #" },
              { key: "orderId", header: "Order ID" },
              { key: "invoiceDate", header: "Invoice Date" },
              { key: "dueDate", header: "Due Date" },
              { key: "totalDue", header: "Total Due", format: formatCurrencyExport },
              { key: "paymentsApplied", header: "Payments Applied", format: formatCurrencyExport },
              { key: "status", header: "Status" },
              { key: "palletCount", header: "Pallets" },
              { key: "eta", header: "ETA" },
            ]}
            filename="invoices"
          />
      </div>

      
      {/* Invoices Summary Banner */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Due</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalDue)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Paid Invoices</p>
              <p className="text-2xl font-bold text-foreground">{paidCount}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-foreground">{unpaidCount}</p>
            </div>
            <div className="text-center border-l-2 border-primary pl-6">
              <p className="text-sm text-muted-foreground mb-1">OUTSTANDING</p>
              <p className="text-3xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
              <p className="text-xs text-muted-foreground mt-1">to be paid</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Due" value={formatCurrency(totalDue)} />
        <KPICard title="Total Paid" value={formatCurrency(totalPaid)} />
        <KPICard title="Outstanding" value={formatCurrency(totalOutstanding)} />
        <KPICard title="Unpaid Count" value={unpaidCount.toString()} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-input border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{filteredInvoices.length}</span> of{" "}
        <span className="font-medium text-foreground">{invoices.length}</span> invoices
      </div>

      <DataTable columns={columns} data={filteredInvoices} />
    </div>
  )
}
