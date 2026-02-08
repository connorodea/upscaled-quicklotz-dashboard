"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Package, DollarSign, Percent } from "lucide-react";

interface Week {
  week: string;
  weekStart: string;
  weekEnd: string;
  avgDailyListings: number;
  avgDailyMSRP: number;
  peakMSRP: number;
  minMSRP: number;
  newListings: number;
  removedListings: number;
  categories?: Category[];
}

interface Category {
  category: string;
  avgCount?: number;
  avgMSRP?: number;
  count?: number;
  totalMSRP?: number;
  percentOfMSRP: number;
}

interface TrackingData {
  weeks: Week[];
  currentCategories?: {
    categories: Category[];
    totalMSRP: number;
    totalListings: number;
  };
}

const COLORS = [
  "oklch(0.7 0.15 250)",
  "oklch(0.7 0.15 200)",
  "oklch(0.7 0.15 150)",
  "oklch(0.7 0.15 100)",
  "oklch(0.7 0.15 50)",
  "oklch(0.7 0.15 0)",
  "oklch(0.6 0.15 250)",
  "oklch(0.6 0.15 200)",
  "oklch(0.6 0.15 150)",
  "oklch(0.6 0.15 100)",
];

export function MsrpTrendsContent() {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/available-msrp-tracking")
      .then((res) => res.json())
      .then((data) => {
        setTrackingData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching tracking data:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading MSRP trends...</p>
        </div>
      </div>
    );
  }

  if (!trackingData || trackingData.weeks.length === 0) {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>MSRP Trends</CardTitle>
            <CardDescription>Historical tracking will appear here after the first week of data collection</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The scraper runs twice daily (8am & 8pm) to collect data. Check back after a few days to see trends!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare weekly trend data (reverse to show oldest first)
  const weeklyTrend = [...trackingData.weeks].reverse().map((week) => ({
    week: week.week,
    weekLabel: new Date(week.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    avgMSRP: week.avgDailyMSRP,
    peakMSRP: week.peakMSRP,
    minMSRP: week.minMSRP,
    listings: week.avgDailyListings,
  }));

  // Current categories (from latest snapshot)
  const currentCategories = trackingData.currentCategories?.categories || [];
  const topCategories = currentCategories.slice(0, 10); // Top 10 by MSRP

  // Calculate summary stats from most recent week
  const latestWeek = trackingData.weeks[0];
  const totalAvailableMSRP = latestWeek?.avgDailyMSRP || 0;

  // Estimate all-in cost (current bid × 2 for shipping)
  // Since we dont have current bids in weekly data, well use MSRP for display
  // In real implementation, this would come from current listings
  const estimatedBid = totalAvailableMSRP * 0.15; // Assume 15% of MSRP as typical bid
  const estimatedAllIn = estimatedBid * 1.64; // Bid + shipping
  const sourcingPct = (estimatedAllIn / totalAvailableMSRP) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">MSRP Trends & Category Analysis</h1>
        <p className="text-muted-foreground">
          Track available inventory, sourcing opportunities, and category breakdowns over time
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily MSRP</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalAvailableMSRP / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">Available to source</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestWeek?.avgDailyListings || 0}</div>
            <p className="text-xs text-muted-foreground">Auctions per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Sourcing %</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sourcingPct.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">All-in ÷ MSRP (incl. shipping)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentCategories.length}</div>
            <p className="text-xs text-muted-foreground">Unique categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly MSRP Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly MSRP Availability Trend</CardTitle>
          <CardDescription>Average daily MSRP available to source (Monday-Friday)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                labelFormatter={(label) => `Week of ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgMSRP"
                stroke="oklch(0.7 0.15 250)"
                strokeWidth={2}
                name="Avg Daily MSRP"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="peakMSRP"
                stroke="oklch(0.6 0.15 100)"
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Peak MSRP"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution by MSRP</CardTitle>
            <CardDescription>Top 10 categories by sourcing insights</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.category.substring(0, 8)}... ${entry.percentOfMSRP.toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalMSRP"
                >
                  {topCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categories by MSRP</CardTitle>
            <CardDescription>Available sourcing inventory by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCategories}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickFormatter={(value) => value.substring(0, 10)}
                />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Total MSRP"]}
                />
                <Bar dataKey="totalMSRP" fill="oklch(0.7 0.15 250)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
          <CardDescription>Detailed breakdown of sourcing opportunities by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Listings</th>
                  <th className="text-right p-2">Total MSRP</th>
                  <th className="text-right p-2">% of MSRP</th>
                  <th className="text-right p-2">Est. All-In*</th>
                  <th className="text-right p-2">Est. Sourcing % (COGS)**</th>
                </tr>
              </thead>
              <tbody>
                {currentCategories.slice(0, 15).map((category, index) => {
                  const msrp = category.totalMSRP || 0;
                  const estimatedBid = msrp * 0.15;
                  const estimatedAllIn = estimatedBid * 1.64;
                  const recovery = (estimatedAllIn / msrp) * 100;
                  
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{category.category}</td>
                      <td className="text-right p-2">{category.count}</td>
                      <td className="text-right p-2">${msrp.toLocaleString()}</td>
                      <td className="text-right p-2">{category.percentOfMSRP.toFixed(1)}%</td>
                      <td className="text-right p-2 text-muted-foreground">
                        ${estimatedAllIn.toLocaleString()}
                      </td>
                      <td className="text-right p-2">
                        <span className={recovery < 30 ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                          {recovery.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>* Est. All-In = (Estimated Bid × 1.64) to account for shipping costs</p>
                  <th className="text-right p-2">Est. Sourcing % (COGS)**</th>
            <p className="text-green-600">Green = Under 30% sourcing % (better margins opportunity)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
