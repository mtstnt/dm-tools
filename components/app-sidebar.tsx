"use client"

import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { CalendarDays, FileText, History, Home, LayoutGrid, UserCheck } from "lucide-react"
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { collection, query as qf, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calculator } from "lucide-react";
import { Hash } from "lucide-react";

export function AppSidebar() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) { setIsAdmin(false); return; }
      try {
        const email = (user.email || "").toLowerCase();
        const q = qf(collection(db, "members"), where("isAdmin", "==", true));
        const snap = await getDocs(q);
        setIsAdmin(snap.docs.some((d) => ((d.data()?.email || "") as string).toLowerCase() === email));
      } catch (e) {
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);
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
                  render={<a href="/tools" />}
                  className="gap-3 rounded-md transition-colors hover:bg-accent/60"
                >
                  <Home className="size-4 text-muted-foreground" />
                  <span className="text-sm">Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<a href="/tools/reports" />}
                  className="gap-3 rounded-md transition-colors hover:bg-accent/60"
                >
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-sm">Reports</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<a href="/tools/reports-history" />}
                  className="gap-3 rounded-md transition-colors hover:bg-accent/60"
                >
                  <History className="size-4 text-muted-foreground" />
                  <span className="text-sm">Reports History</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<a href="/tools/assign" />}
                  className="gap-3 rounded-md transition-colors hover:bg-accent/60"
                >
                  <UserCheck className="size-4 text-muted-foreground" />
                  <span className="text-sm">Assign</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<a href="/tools/events" />}
                  className="gap-3 rounded-md transition-colors hover:bg-accent/60"
                >
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <span className="text-sm">Events</span>
                  <span className="ml-auto text-[10px] font-medium tracking-wide text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded">
                    Exp
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<a href="/tools/members" />}
                    className="gap-3 rounded-md transition-colors hover:bg-accent/60"
                  >
                    <UserCheck className="size-4 text-muted-foreground" />
                    <span className="text-sm">Members</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                  render={<a href="/tools/tally" />}
                  className="gap-3 rounded-md transition-colors hover:bg-accent/60"
                >
                  <Hash className="size-4 text-muted-foreground" />
                  <span className="text-sm">AltarCalls</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<a href="/tools/doa-wilayah" />}
                  className="gap-3 rounded-md transition-colors hover:bg-accent/60"
                >
                  <UserCheck className="size-4 text-muted-foreground" />
                  <span className="text-sm">Doa Wilayah</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
