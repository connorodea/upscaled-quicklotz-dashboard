import { AppSidebar } from "@/components/app-sidebar"
import { MarketplaceProjectionsContent } from "@/components/marketplace-projections-content"

export default function MarketplaceProjectionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pt-16 md:pt-0 md:ml-64 min-h-screen p-3 sm:p-4 md:p-6 overflow-x-hidden">
        <MarketplaceProjectionsContent />
      </main>
    </div>
  )
}
