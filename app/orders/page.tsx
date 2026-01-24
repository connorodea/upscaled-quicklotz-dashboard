import { AppSidebar } from "@/components/app-sidebar"
import { OrdersContent } from "@/components/orders-content"

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen p-6">
        <OrdersContent />
      </main>
    </div>
  )
}
