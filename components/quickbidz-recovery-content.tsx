"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, Percent, Package, TrendingUp, ExternalLink } from "lucide-react";

interface Overview {
  totalItems: number;
  totalRetail: number;
  totalWithPremium: number;
  blendedRecovery: number;
  avgRecovery: number;
  avgFinalBid: number;
  oldestScrape: string;
  latestScrape: string;
}

interface Category {
  category: string;
  itemCount: number;
  totalRetail: number;
  totalWithPremium: number;
  avgRecovery: number;
  avgFinalBid: number;
  blendedRecovery: number;
}

interface RecentAuction {
  listingId: string;
  title: string;
  category: string;
  retailPrice: number;
  finalBid: number;
  totalWithPremium: number;
  recoveryPct: number;
  condition: string;
  bidCount: number;
  auctionUrl: string;
  scrapedAt: string;
}

interface Distribution {
  range: string;
  count: number;
}

interface ApiResponse {
  success: boolean;
  overview: Overview;
  categories: Category[];
  recentAuctions: RecentAuction[];
  distribution: Distribution[];
}

const CATEGORY_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#eab308", "#dc2626", "#7c3aed", "#db2777"
];

export function QuickBidzRecoveryContent() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quickbidz-recovery")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching QuickBidz recovery data:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading QuickBidz recovery data...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>QuickBidz Recovery Analysis</CardTitle>
            <CardDescription>Unable to load data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              There was an error loading the QuickBidz recovery data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview, categories, recentAuctions, distribution } = data;

  // Prepare chart data
  const categoryChartData = categories.slice(0, 12).map((cat, index) => ({
    name: cat.category.length > 15 ? cat.category.substring(0, 15) + "..." : cat.category,
    fullName: cat.category,
    recovery: cat.blendedRecovery,
    items: cat.itemCount,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
  }));

  // Prepare pie chart data for item distribution
  const pieData = categories.slice(0, 8).map((cat, index) => ({
    name: cat.category,
    value: cat.itemCount,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
  }));

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return "$" + (value / 1000000).toFixed(1) + "M";
    if (value >= 1000) return "$" + (value / 1000).toFixed(0) + "K";
    return "$" + value.toFixed(0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">QuickBidz Recovery Analysis</h1>
        <p className="text-muted-foreground">
          Past auction results for Electronics & Appliances with 13% buyer premium applied
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Last updated: {formatDate(overview.latestScrape)}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blended Recovery</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview.blendedRecovery.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">With 13% buyer premium</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Past auctions analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retail</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview.totalRetail)}</div>
            <p className="text-xs text-muted-foreground">MSRP value analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Final Bid</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview.avgFinalBid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Before buyer premium</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recovery by Category Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Recovery % by Category</CardTitle>
            <CardDescription>Blended recovery rate with 13% buyer premium</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoryChartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 50]} tickFormatter={(v) => v + "%"} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    value.toFixed(1) + "%",
                    "Recovery (" + props.payload.items + " items)"
                  ]}
                  labelFormatter={(label) => categoryChartData.find(c => c.name === label)?.fullName || label}
                />
                <Bar dataKey="recovery" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Items by Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Items by Category</CardTitle>
            <CardDescription>Distribution of past auction items</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={130}
                  dataKey="value"
                  label={({ name, percent }) =>
                    percent > 0.05 ? name.substring(0, 10) + "... " + (percent * 100).toFixed(0) + "%" : ""
                  }
                >
                  {pieData.map((entry, index) => (
                    <Cell key={"cell-" + index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value.toLocaleString(), "Items"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Detailed recovery metrics by product category</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total Retail</TableHead>
                <TableHead className="text-right">Total w/ Premium</TableHead>
                <TableHead className="text-right">Blended Recovery</TableHead>
                <TableHead className="text-right">Avg Final Bid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat, index) => (
                <TableRow key={cat.category}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                      />
                      {cat.category}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{cat.itemCount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatCurrency(cat.totalRetail)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(cat.totalWithPremium)}</TableCell>
                  <TableCell className="text-right">
                    <span className={cat.blendedRecovery < 25 ? "text-green-600 font-medium" : "text-amber-600"}>
                      {cat.blendedRecovery.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">${cat.avgFinalBid.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Auctions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Auction Results</CardTitle>
          <CardDescription>Most recently scraped past auction items (showing 100 most recent)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background">Title</TableHead>
                  <TableHead className="sticky top-0 bg-background">Category</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Retail</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Final Bid</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">w/ Premium</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Recovery</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Bids</TableHead>
                  <TableHead className="sticky top-0 bg-background">Condition</TableHead>
                  <TableHead className="sticky top-0 bg-background"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAuctions.map((auction) => (
                  <TableRow key={auction.listingId}>
                    <TableCell className="max-w-[200px] truncate" title={auction.title}>
                      {auction.title || "N/A"}
                    </TableCell>
                    <TableCell className="text-xs">{auction.category}</TableCell>
                    <TableCell className="text-right">${auction.retailPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${auction.finalBid.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${auction.totalWithPremium.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className={auction.recoveryPct < 25 ? "text-green-600" : "text-amber-600"}>
                        {auction.recoveryPct.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{auction.bidCount || "-"}</TableCell>
                    <TableCell className="text-xs">{auction.condition || "-"}</TableCell>
                    <TableCell>
                      {auction.auctionUrl && (
                        <a
                          href={auction.auctionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Formula Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Recovery Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Formula:</strong> Recovery % = (Final Bid x 1.13) / Retail Price x 100</p>
            <p><strong>Buyer Premium:</strong> 13% applied to final hammer price</p>
            <p><strong>Example:</strong> $100 retail, $10 final bid = $11.30 total cost = 11.3% recovery</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
