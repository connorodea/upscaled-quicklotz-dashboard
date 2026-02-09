"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ComparisonPeriod } from "@/lib/comparison"

interface ComparisonPickerProps {
  value: ComparisonPeriod
  onChange: (period: ComparisonPeriod) => void
  className?: string
}

const options: { value: ComparisonPeriod; label: string }[] = [
  { value: "none", label: "No Comparison" },
  { value: "week", label: "Week over Week" },
  { value: "month", label: "Month over Month" },
  { value: "quarter", label: "Quarter over Quarter" },
]

export function ComparisonPicker({ value, onChange, className }: ComparisonPickerProps) {
  const selectedOption = options.find((opt) => opt.value === value) || options[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            value === "none" && "text-muted-foreground",
            className
          )}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          {selectedOption.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[180px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(value === option.value && "bg-accent")}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Hook for managing comparison state
export function useComparison(defaultPeriod: ComparisonPeriod = "none") {
  const [comparisonPeriod, setComparisonPeriod] = React.useState<ComparisonPeriod>(defaultPeriod)

  return {
    comparisonPeriod,
    setComparisonPeriod,
  }
}
