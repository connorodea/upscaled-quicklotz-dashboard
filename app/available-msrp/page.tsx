import { AppSidebar } from "@/components/app-sidebar"
import { AvailableMSRPContent } from "@/components/available-msrp-content"

export default function AvailableMSRPPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pt-16 md:pt-0 md:ml-64 min-h-screen p-3 sm:p-4 md:p-6 overflow-x-hidden">
        <AvailableMSRPContent />
      </main>
    </div>
  )
}
