import { AppSidebar } from "@/components/app-sidebar"
import { LineItemsContent } from "@/components/line-items-content"

export default function LineItemsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen p-6">
        <LineItemsContent />
      </main>
    </div>
  )
}
