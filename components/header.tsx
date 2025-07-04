import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export function Header() {
  return (
    <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <h1 className="text-base sm:text-lg font-semibold truncate">Admin Dashboard</h1>
      </div>
    </header>
  )
}