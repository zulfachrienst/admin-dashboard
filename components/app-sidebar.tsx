"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Package, MessageSquare, BarChart3, Activity, Settings, LogOut, Bot, FileText, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"

interface AppSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

const menuItems = [
  {
    title: "Products",
    icon: Package,
    id: "products",
  },
  {
    title: "Chats",
    icon: MessageSquare,
    id: "chats",
  },
  {
    title: "Statistics",
    icon: BarChart3,
    id: "stats",
  },
  {
    title: "Health Monitor",
    icon: Activity,
    id: "health",
  },
  {
    title: "Logs",
    icon: FileText,
    id: "logs",
  },
  {
    title: "Settings",
    icon: Settings,
    id: "settings",
  },
]

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold">AI Chatbot</h2>
            <p className="text-sm text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>

        {user && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Signed in as:</p>
            <p className="text-sm text-blue-800 truncate" title={user.email || ""}>
              {user.email}
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton onClick={() => onSectionChange(item.id)} isActive={activeSection === item.id}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button variant="outline" onClick={handleLogout} disabled={loggingOut} className="w-full justify-start">
          {loggingOut ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
