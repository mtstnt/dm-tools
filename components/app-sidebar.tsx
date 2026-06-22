import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Home, FileText, LayoutGrid } from "lucide-react"
import { LogoutButton } from "./logout-button"

export function AppSidebar() {
  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/tools" />}>
              <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <LayoutGrid className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="font-display text-base tracking-tight">DM Tools</span>
                <span className="text-[11px] text-muted-foreground">Data Ministry</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/60 font-medium px-2 mb-1">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<a href="/tools/reports" />}
                  className="gap-3 rounded-md transition-colors hover:bg-accent/60"
                >
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-sm">Reports</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
