import { AppSidebar } from "@/components/app-sidebar"
import { InvoicesContent } from "@/components/invoices-content"

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen p-6">
        <InvoicesContent />
      </main>
    </div>
  )
}
