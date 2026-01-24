import { AppSidebar } from "@/components/app-sidebar"
import { ProjectionsContent } from "@/components/projections-content"

export default function ProjectionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen p-6">
        <ProjectionsContent />
      </main>
    </div>
  )
}
