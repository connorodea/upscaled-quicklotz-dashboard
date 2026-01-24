import { cn } from "@/lib/utils"

type StatusType = "success" | "warning" | "danger" | "info" | "neutral"

interface StatusBadgeProps {
  status: string
  type?: StatusType
  className?: string
}

const statusStyles: Record<StatusType, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-primary/15 text-primary border-primary/30",
  neutral: "bg-muted text-muted-foreground border-border",
}

export function StatusBadge({ status, type = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[type],
        className
      )}
    >
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        type === "success" && "bg-success",
        type === "warning" && "bg-warning",
        type === "danger" && "bg-destructive",
        type === "info" && "bg-primary",
        type === "neutral" && "bg-muted-foreground"
      )} />
      {status}
    </span>
  )
}
