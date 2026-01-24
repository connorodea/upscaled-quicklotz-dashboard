"use client"

import { useState } from "react"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { KPICard } from "@/components/kpi-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { invoices, type Invoice } from "@/lib/mock-data"
import { Search, Filter, Upload, CheckCircle, FileText } from "lucide-react"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function InvoicesContent() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesSearch =
      searchQuery === "" ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.orderId.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const paidAmount = invoices
    .filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + inv.amount, 0)
  const pendingAmount = invoices
    .filter((inv) => inv.status === "Pending")
    .reduce((sum, inv) => sum + inv.amount, 0)
  const overdueAmount = invoices
    .filter((inv) => inv.status === "Overdue")
    .reduce((sum, inv) => sum + inv.amount, 0)

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
      key: "amount",
      header: "Amount",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "status",
      header: "Status",
      render: (value) => (
        <StatusBadge
          status={value as string}
          type={
            value === "Paid"
              ? "success"
              : value === "Pending"
                ? "warning"
                : "danger"
          }
        />
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (value) =>
        new Date(value as string).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      className: "text-muted-foreground",
    },
    {
      key: "paidDate",
      header: "Paid Date",
      render: (value) =>
        value
          ? new Date(value as string).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "-",
      className: "text-muted-foreground",
    },
    {
      key: "id",
      header: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <FileText className="h-4 w-4" />
          </Button>
          {row.status !== "Paid" && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-success hover:text-success">
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      className: "w-[100px]",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage invoice payments
          </p>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard
          title="Paid"
          value={formatCurrency(paidAmount)}
        />
        <KPICard
          title="Pending"
          value={formatCurrency(pendingAmount)}
        />
        <KPICard
          title="Overdue"
          value={formatCurrency(overdueAmount)}
        />
      </div>

      {/* Filters */}
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
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-input border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{filteredInvoices.length}</span> of{" "}
        <span className="font-medium text-foreground">{invoices.length}</span> invoices
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filteredInvoices} />
    </div>
  )
}
