import { AppSidebar } from "@/components/app-sidebar"
import { VacImProjectionContent } from "@/components/vac-im-projection-content"

export default function VacImProjectionPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pt-16 md:pt-0 md:ml-64 min-h-screen p-3 sm:p-4 md:p-6 overflow-x-hidden">
        <VacImProjectionContent />
      </main>
    </div>
  )
}
