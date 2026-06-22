import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function ToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="flex h-14 items-center border-b border-border/60 px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
          </header>
          <div className="flex-1 p-6 md:p-8 lg:p-10 animate-page-enter">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </TooltipProvider>
  )
}
