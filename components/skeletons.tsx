"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// KPI Card Skeleton
export function KPICardSkeleton() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Summary Banner Skeleton
export function SummaryBannerSkeleton() {
  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardContent className="py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-4 w-20 mx-auto" />
              <Skeleton className="h-8 w-28 mx-auto" />
            </div>
          ))}
          <div className="text-center border-l-2 border-primary/30 pl-6 space-y-2">
            <Skeleton className="h-4 w-24 mx-auto" />
            <Skeleton className="h-10 w-32 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Data Table Skeleton
export function DataTableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {[...Array(columns)].map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-[100px]" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(rows)].map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border">
                  {[...Array(columns)].map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// Chart Skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="flex items-end justify-around gap-2 pt-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${30 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Pie Chart Skeleton
export function PieChartSkeleton() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <Skeleton className="h-48 w-48 rounded-full" />
      </CardContent>
    </Card>
  )
}

// Dashboard Loading Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Summary Banner */}
      <SummaryBannerSkeleton />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <PieChartSkeleton />
      </div>

      {/* Data Table */}
      <DataTableSkeleton rows={5} columns={5} />
    </div>
  )
}

// Orders Loading Skeleton
export function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Summary Banner */}
      <SummaryBannerSkeleton />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PieChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Data Table */}
      <DataTableSkeleton rows={8} columns={8} />
    </div>
  )
}

// Invoices Loading Skeleton
export function InvoicesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Summary Banner */}
      <SummaryBannerSkeleton />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-10 flex-1 min-w-[250px] max-w-md" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Data Table */}
      <DataTableSkeleton rows={10} columns={7} />
    </div>
  )
}

// Tracking Loading Skeleton
export function TrackingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Summary Banner */}
      <SummaryBannerSkeleton />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-10 flex-1 min-w-[250px] max-w-md" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Data Table */}
      <DataTableSkeleton rows={10} columns={8} />
    </div>
  )
}

// Projections Loading Skeleton
export function ProjectionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Summary Banner */}
      <SummaryBannerSkeleton />

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>

      {/* Chart */}
      <ChartSkeleton height={400} />

      {/* Data Table */}
      <DataTableSkeleton rows={5} columns={5} />
    </div>
  )
}

// Weekly Summaries Loading Skeleton
export function WeeklySummariesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>

      {/* Summary Banner */}
      <SummaryBannerSkeleton />

      {/* Settings Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Data Table */}
      <DataTableSkeleton rows={8} columns={8} />
    </div>
  )
}
