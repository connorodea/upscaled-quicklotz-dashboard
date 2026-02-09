"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  List,
  FileText,
  Truck,
  TrendingUp,
  Settings,
  ClipboardList,
  Gavel,
  ShoppingCart,
  CalendarDays,
  Search,
  Database,
  Menu,
  X,
  Banknote,
  Store,
  Wrench,
  Wind,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { SyncStatusCompact } from "@/components/sync-status"

const mainNavItems = [
  { href: "/", label: "Executive Dashboard", icon: LayoutDashboard },
  { href: "/weekly-summaries", label: "Weekly Summaries", icon: CalendarDays },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/line-items", label: "Line Items", icon: List },
  { href: "/master-manifest", label: "Master Manifest", icon: Database },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/tracking", label: "Tracking", icon: Truck },
  { href: "/projections", label: "Financial Projections", icon: TrendingUp },
  { href: "/auction-projections", label: "Auction Projections", icon: Gavel },
  { href: "/wholesale-projections", label: "Wholesale Projections", icon: ShoppingCart },
  { href: "/cashflow-projections", label: "Cashflow Projections", icon: Banknote },
  { href: "/marketplace-projections", label: "MP Projections", icon: Store },
  { href: "/refurb-projections", label: "Refurb Projections", icon: Wrench },
  { href: "/vac-im-projection", label: "Vac/IM Projection", icon: Wind },
]

const secondaryNavItems = [
  { href: "/bst-etl", label: "BST-ETL", icon: Database },
  { href: "/quickbidz-recovery", label: "QuickBidz Recovery", icon: Gavel },
  { href: "/available-msrp", label: "Sourcing Insights", icon: Search },
  { href: "/msrp-trends", label: "MSRP Trends", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/audit-log", label: "Audit Log", icon: ClipboardList },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-border bg-sidebar px-4 md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md overflow-hidden bg-white p-1">
            <Image
              src="/upscaled-logo.png"
              alt="Upscaled"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">Upscaled</span>
            <span className="text-xs text-muted-foreground">Sourcing</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 z-40 h-screen w-64 border-r border-border bg-sidebar transition-transform duration-300 ease-in-out",
          "md:left-0 md:translate-x-0",
          mobileMenuOpen ? "left-0 translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo - Desktop Only */}
          <div className="hidden md:flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-md overflow-hidden bg-white p-1">
              <Image
                src="/upscaled-logo.png"
                alt="Upscaled"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Upscaled</span>
              <span className="text-xs text-muted-foreground">Sourcing Platform</span>
            </div>
          </div>

          {/* Mobile: Add top padding to account for fixed header */}
          <div className="h-16 md:hidden" />

          {/* Main Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Main
            </div>
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
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
              Tools
            </div>
            {secondaryNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
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

          {/* Theme Toggle & Sync Status */}
          <div className="border-t border-sidebar-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <SyncStatusCompact />
          </div>
        </div>
      </aside>
    </>
  )
}
