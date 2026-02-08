"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { downloadCSV, downloadExcel, type ExportColumn } from "@/lib/export"

interface ExportButtonProps<T extends Record<string, any>> {
  data: T[]
  columns: ExportColumn[]
  filename: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

export function ExportButton<T extends Record<string, any>>({
  data,
  columns,
  filename,
  variant = "outline",
  size = "sm",
}: ExportButtonProps<T>) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: "csv" | "excel") => {
    setExporting(true)
    try {
      // Small delay for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 200))

      const timestampedFilename = `${filename}_${new Date().toISOString().split("T")[0]}`

      if (format === "csv") {
        downloadCSV(data, columns, timestampedFilename)
      } else {
        downloadExcel(data, columns, timestampedFilename)
      }
    } finally {
      setExporting(false)
    }
  }

  if (data.length === 0) {
    return (
      <Button variant={variant} size={size} disabled>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export for Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
