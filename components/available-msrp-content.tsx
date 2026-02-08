"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { Search, Download, TrendingUp, DollarSign, Package } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

interface ListingAnalysis {
  id: string
  category: string
  lotId: string
  title: string
  msrp: number
  currentBid: number
  bidPercentMSRP: number
  estimatedAllInPercent: number
  estimatedAllIn: number
  estimatedProfit15: number
  estimatedProfit20: number
  estimatedProfit25: number
  timeRemaining: string
  url: string
}

interface CategorySummary {
  category: string
  count: number
  totalMSRP: number
  avgBidPercent: number
  estimatedAllIn: number
  availableOpportunity: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatPercent = (value: number) => `${value.toFixed(1)}%`

const COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#6366f1",
]

export function AvailableMSRPContent() {
  const [scraping, setScraping] = useState(false)
  const [listings, setListings] = useState<ListingAnalysis[]>([])
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([])
  const [historicalAvgCogsPercent] = useState(4.8) // From your existing data

const handleScrape = async () => {
    setScraping(true)
    try {
      const response = await fetch("/api/scrape-available-msrp", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        // Calculate estimates using historical COGS data
        const analyzed = data.listings.map((listing: any, index: number) => {
          const msrp = listing.msrp || 0
          const currentBid = listing.currentBid || 0
          const bidPercentMSRP = msrp > 0 ? (currentBid / msrp) * 100 : 0

          // Estimate all-in based on historical data
          const estimatedAllInPercent = historicalAvgCogsPercent
          const estimatedAllIn = msrp * (estimatedAllInPercent / 100)

          // Calculate estimated profit at different recovery rates
          const estimatedProfit15 = (msrp * 0.15) - estimatedAllIn
          const estimatedProfit20 = (msrp * 0.20) - estimatedAllIn
          const estimatedProfit25 = (msrp * 0.25) - estimatedAllIn

          return {
            id: (index + 1).toString(),
            category: listing.category || "General Merchandise",
            lotId: listing.lotId || "",
            title: listing.title || "",
            msrp,
            currentBid,
            bidPercentMSRP,
            estimatedAllInPercent,
            estimatedAllIn,
            estimatedProfit15,
            estimatedProfit20,
            estimatedProfit25,
            timeRemaining: listing.timeRemaining || "",
            url: listing.url || "",
          }
        })

        setListings(analyzed)

        // Calculate category summaries
        const categoryMap: Record<string, CategorySummary> = {}
        analyzed.forEach((listing: ListingAnalysis) => {
          if (!categoryMap[listing.category]) {
            categoryMap[listing.category] = {
              category: listing.category,
              count: 0,
              totalMSRP: 0,
              avgBidPercent: 0,
              estimatedAllIn: 0,
              availableOpportunity: 0,
            }
          }

          const cat = categoryMap[listing.category]
          cat.count++
          cat.totalMSRP += listing.msrp
          cat.estimatedAllIn += listing.estimatedAllIn
          cat.avgBidPercent += listing.bidPercentMSRP
        })

        const summaries = Object.values(categoryMap).map(cat => ({
          ...cat,
          avgBidPercent: cat.avgBidPercent / cat.count,
          availableOpportunity: cat.totalMSRP - cat.estimatedAllIn,
        })).sort((a, b) => b.totalMSRP - a.totalMSRP)

        setCategorySummaries(summaries)
      }
    } catch (error) {
      console.error("Scraping failed:", error)
    }
    setScraping(false)
  }

  const totalMSRP = listings.reduce((sum, l) => sum + l.msrp, 0)
  const totalEstimatedAllIn = listings.reduce((sum, l) => sum + l.estimatedAllIn, 0)
  const totalOpportunity = totalMSRP - totalEstimatedAllIn
  const avgBidPercent = listings.length > 0
    ? listings.reduce((sum, l) => sum + l.bidPercentMSRP, 0) / listings.length
    : 0

  const listingColumns: Column<ListingAnalysis>[] = [
    {
      key: "category",
      header: "Category",
      className: "font-medium max-w-[150px] truncate"
    },
    {
      key: "title",
      header: "Title",
      className: "font-medium max-w-[200px] truncate"
    },
    {
      key: "msrp",
      header: "MSRP",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "currentBid",
      header: "Current Bid",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "bidPercentMSRP",
      header: "Bid %",
      render: (value) => formatPercent(value as number),
      className: "font-mono text-right",
    },
    {
      key: "estimatedAllIn",
      header: "Est. All-in",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right text-muted-foreground",
    },
    {
      key: "estimatedProfit20",
      header: "Est. Profit @ 20%",
      render: (value) => {
        const profit = value as number
        return (
          <span className={profit >= 0 ? "text-primary" : "text-destructive"}>
            {formatCurrency(profit)}
          </span>
        )
      },
      className: "font-mono text-right",
    },
    {
      key: "timeRemaining",
      header: "Time Left",
      className: "font-mono text-sm",
    },
  ]

  const categoryColumns: Column<CategorySummary>[] = [
    { key: "category", header: "Category", className: "font-medium" },
    {
      key: "count",
      header: "Listings",
      render: (value) => value.toString(),
      className: "font-mono text-right",
    },
    {
      key: "totalMSRP",
      header: "Total MSRP",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right",
    },
    {
      key: "avgBidPercent",
      header: "Avg Bid %",
      render: (value) => formatPercent(value as number),
      className: "font-mono text-right",
    },
    {
      key: "estimatedAllIn",
      header: "Est. All-in Cost",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right text-muted-foreground",
    },
    {
      key: "availableOpportunity",
      header: "Available Opportunity",
      render: (value) => formatCurrency(value as number),
      className: "font-mono text-right text-primary font-bold",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sourcing Insights Scraper</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyze sourcing insights and sourcing opportunities by category
          </p>
        </div>
        <div className="flex gap-2">
          {listings.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          <Button
            onClick={handleScrape}
            disabled={scraping}
            size="sm"
          >
            <Search className={`h-4 w-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />
            {scraping ? "Scraping..." : "Scrape Listings"}
          </Button>
        </div>
      </div>

      {listings.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Data Yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Scrape Listings" to analyze current Sourcing Insights inventory
            </p>
            <p className="text-xs text-muted-foreground max-w-md text-center">
              Using historical avg COGS: {formatPercent(historicalAvgCogsPercent)} of MSRP
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Available MSRP Summary Banner */}
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="py-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total MSRP Available</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMSRP)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Est. All-in Cost</p>
                  <p className="text-2xl font-bold text-destructive">-{formatCurrency(totalEstimatedAllIn)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Avg Bid %</p>
                  <p className="text-2xl font-bold text-foreground">{formatPercent(avgBidPercent)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Listings</p>
                  <p className="text-2xl font-bold text-foreground">{listings.length}</p>
                </div>
                <div className="text-center border-l-2 border-primary pl-6">
                  <p className="text-sm text-muted-foreground mb-1">TOTAL OPPORTUNITY</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(totalOpportunity)}</p>
                  <p className="text-xs text-muted-foreground mt-1">@ 25% recovery</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total MSRP Available
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMSRP)}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Est. All-in Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalEstimatedAllIn)}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Available Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalOpportunity)}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Avg Current Bid %
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{formatPercent(avgBidPercent)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">MSRP by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categorySummaries.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percent }) =>
                        `${category.substring(0, 15)}... (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalMSRP"
                    >
                      {categorySummaries.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Top Categories by Opportunity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={categorySummaries.slice(0, 6)}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      stroke="hsl(var(--muted-foreground))"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar
                      dataKey="availableOpportunity"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Category Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={categoryColumns} data={categorySummaries} />
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">
                All Listings ({listings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={listingColumns} data={listings} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
