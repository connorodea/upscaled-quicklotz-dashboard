"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface DateRangePickerProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  className?: string
}

const presets = [
  {
    label: "All Time",
    getValue: () => ({ from: undefined, to: undefined }),
  },
  {
    label: "Last 7 Days",
    getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    label: "Last 30 Days",
    getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    label: "Last 90 Days",
    getValue: () => ({ from: subDays(new Date(), 90), to: new Date() }),
  },
  {
    label: "This Month",
    getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }),
  },
  {
    label: "Last Month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    },
  },
  {
    label: "This Year",
    getValue: () => ({ from: startOfYear(new Date()), to: new Date() }),
  },
  {
    label: "Last 6 Months",
    getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }),
  },
  {
    label: "Last 12 Months",
    getValue: () => ({ from: subMonths(new Date(), 12), to: new Date() }),
  },
]

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const getDisplayText = () => {
    if (!dateRange.from && !dateRange.to) {
      return "All Time"
    }
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
    }
    if (dateRange.from) {
      return `From ${format(dateRange.from, "MMM d, yyyy")}`
    }
    return "Select date range"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !dateRange.from && !dateRange.to && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.label}
            onClick={() => onDateRangeChange(preset.getValue())}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Hook for managing date range state with URL persistence
export function useDateRange(defaultRange?: DateRange) {
  const [dateRange, setDateRange] = React.useState<DateRange>(
    defaultRange || { from: undefined, to: undefined }
  )

  const filterByDateRange = React.useCallback(
    <T extends { date?: string }>(items: T[]): T[] => {
      if (!dateRange.from && !dateRange.to) {
        return items
      }

      return items.filter((item) => {
        if (!item.date) return true

        const itemDate = new Date(item.date)

        if (dateRange.from && itemDate < dateRange.from) {
          return false
        }
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to)
          endOfDay.setHours(23, 59, 59, 999)
          if (itemDate > endOfDay) {
            return false
          }
        }

        return true
      })
    },
    [dateRange]
  )

  return {
    dateRange,
    setDateRange,
    filterByDateRange,
  }
}
