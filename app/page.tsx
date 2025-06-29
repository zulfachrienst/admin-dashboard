"use client"

import { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/header"
import { ProductsSection } from "@/components/products-section"
import { ChatsSection } from "@/components/chats-section"
import { StatsSection } from "@/components/stats-section"
import { HealthSection } from "@/components/health-section"
import { SettingsSection } from "@/components/settings-section"
import { LoginPage } from "@/components/login-page"
import { LogsSection } from "@/components/logs-section"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

function DashboardContent() {
  const [activeSection, setActiveSection] = useState("products")
  const { user, loading } = useAuth()

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-600" />
          <span className="text-base sm:text-lg text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />
  }

  const renderSection = () => {
    switch (activeSection) {
      case "products":
        return <ProductsSection />
      case "chats":
        return <ChatsSection />
      case "stats":
        return <StatsSection />
      case "health":
        return <HealthSection />
      case "settings":
        return <SettingsSection />
      case "logs":
        return <LogsSection />
      default:
        return <ProductsSection />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <SidebarInset>
        <Header />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 bg-gray-50 min-h-0 overflow-auto">
          {renderSection()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function Dashboard() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  )
}