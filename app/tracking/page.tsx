import { AppSidebar } from "@/components/app-sidebar"
import { TrackingContent } from "@/components/tracking-content"

export default function TrackingPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen p-6">
        <TrackingContent />
      </main>
    </div>
  )
}
