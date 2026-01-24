"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"

interface SparklineProps {
  data: number[]
}

export function Sparkline({ data }: SparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }))

  return (
    <div className="h-12 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="oklch(0.72 0.15 185)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="oklch(0.72 0.15 185)"
            strokeWidth={1.5}
            fill="url(#sparklineGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
