import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"
import { AccountInfo } from "@/components/account-info"
import { RefreshCacheButton } from "@/components/refresh-cache-button"
import { AuthGuard } from "@/components/auth-guard"

export default function ToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthGuard>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 px-6 bg-background/80 backdrop-blur-sm">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <div className="flex items-center gap-1">
                <RefreshCacheButton />
                <ThemeToggle />
                <AccountInfo />
              </div>
            </header>
            <div className="flex-1 p-6 md:p-8 lg:p-10 animate-page-enter">
              {children}
            </div>
          </main>
        </SidebarProvider>
      </TooltipProvider>
    </AuthGuard>
  )
}
