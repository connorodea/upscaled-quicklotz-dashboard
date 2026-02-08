"use client"

import dynamic from "next/dynamic"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

const Sparkline = dynamic(() => import("@/components/sparkline").then((mod) => mod.Sparkline), {
  ssr: false,
  loading: () => <div className="h-12 w-24 animate-pulse rounded bg-muted" />,
})

interface KPICardProps {
  title: string
  value: string
  delta?: number
  deltaLabel?: string
  subtitle?: string
  sparklineData?: number[]
  prefix?: string
  suffix?: string
  className?: string
}

export function KPICard({
  title,
  value,
  delta,
  deltaLabel = "vs last period",
  subtitle,
  sparklineData,
  className,
}: KPICardProps) {
  const deltaColor =
    delta && delta > 0 ? "text-success" : delta && delta < 0 ? "text-destructive" : "text-muted-foreground"
  const DeltaIcon = delta && delta > 0 ? ArrowUp : delta && delta < 0 ? ArrowDown : Minus

  return (
    <div className={cn("rounded-lg border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 font-mono text-2xl font-bold text-card-foreground">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {delta !== undefined && (
            <div className={cn("mt-2 flex items-center gap-1 text-xs", deltaColor)}>
              <DeltaIcon className="h-3 w-3" />
              <span>
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">{deltaLabel}</span>
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && <Sparkline data={sparklineData} />}
      </div>
    </div>
  )
}
