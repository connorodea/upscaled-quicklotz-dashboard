"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  List,
  FileText,
  Truck,
  TrendingUp,
  Settings,
  HelpCircle,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"

const mainNavItems = [
  { href: "/", label: "Executive Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/line-items", label: "Line Items", icon: List },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/tracking", label: "Tracking", icon: Truck },
  { href: "/projections", label: "Financial Projections", icon: TrendingUp },
]

const secondaryNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/audit-log", label: "Audit Log", icon: ClipboardList },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">Sourcing</span>
            <span className="text-xs text-muted-foreground">Platform</span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Main
          </div>
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="border-t border-sidebar-border px-3 py-4">
          <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            System
          </div>
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Sync Status */}
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-md bg-sidebar-accent p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">Data synced</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Last update: 2 min ago</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
