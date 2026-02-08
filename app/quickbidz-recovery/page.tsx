import { AppSidebar } from "@/components/app-sidebar"
import { QuickBidzRecoveryContent } from "@/components/quickbidz-recovery-content"

export default function QuickBidzRecoveryPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pt-16 md:pt-0 md:ml-64 min-h-screen p-3 sm:p-4 md:p-6 overflow-x-hidden">
        <QuickBidzRecoveryContent />
      </main>
    </div>
  )
}
