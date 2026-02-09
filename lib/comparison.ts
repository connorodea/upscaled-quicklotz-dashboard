import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns"

export type ComparisonPeriod = "none" | "week" | "month" | "quarter"

interface DateRange {
  start: Date
  end: Date
}

export interface ComparisonRanges {
  current: DateRange
  previous: DateRange
  label: string
}

export function getComparisonRanges(period: ComparisonPeriod): ComparisonRanges | null {
  if (period === "none") return null

  const now = new Date()

  switch (period) {
    case "week": {
      const currentStart = startOfWeek(now, { weekStartsOn: 1 })
      const currentEnd = endOfWeek(now, { weekStartsOn: 1 })
      const previousStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      const previousEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
        label: "vs last week",
      }
    }
    case "month": {
      const currentStart = startOfMonth(now)
      const currentEnd = endOfMonth(now)
      const previousStart = startOfMonth(subMonths(now, 1))
      const previousEnd = endOfMonth(subMonths(now, 1))
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
        label: "vs last month",
      }
    }
    case "quarter": {
      const currentStart = startOfMonth(subMonths(now, 2))
      const currentEnd = endOfMonth(now)
      const previousStart = startOfMonth(subMonths(now, 5))
      const previousEnd = endOfMonth(subMonths(now, 3))
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
        label: "vs prev quarter",
      }
    }
    default:
      return null
  }
}

export function filterByDateRange<T extends { date?: string }>(
  items: T[],
  range: DateRange
): T[] {
  return items.filter((item) => {
    if (!item.date) return false
    const itemDate = new Date(item.date)
    return isWithinInterval(itemDate, { start: range.start, end: range.end })
  })
}

export function calculateDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

export interface ComparisonMetrics {
  current: number
  previous: number
  delta: number
  label: string
}

export function calculateComparisonMetrics(
  current: number,
  previous: number,
  label: string
): ComparisonMetrics {
  return {
    current,
    previous,
    delta: calculateDelta(current, previous),
    label,
  }
}
