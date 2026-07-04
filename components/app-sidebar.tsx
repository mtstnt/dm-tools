"use client";

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { sidebarMenus, type NavigationChild } from "@/lib/navigation";
import Link from "next/link";

function isLink(
  node: NavigationChild,
): node is Extract<NavigationChild, { type: "link" }> {
  return node.type === "link";
}

function isDropdown(
  node: NavigationChild,
): node is Extract<NavigationChild, { type: "dropdown" }> {
  return node.type === "dropdown";
}

function NavigationNode({
  node,
  nested = false,
}: {
  node: NavigationChild;
  nested?: boolean;
}) {
  if (isLink(node)) {
    if (nested) {
      return (
        <SidebarMenuSubItem>
          <SidebarMenuSubButton render={<Link href={node.targetLink} />}>
            {node.icon && (
              <node.icon className="size-4 text-muted-foreground" />
            )}
            <span>{node.label}</span>
            {node.badge && (
              <span className="ml-auto text-[10px] font-medium tracking-wide text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded">
                {node.badge}
              </span>
            )}
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    }

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={node.targetLink} />}
          className="gap-3 rounded-md transition-colors hover:bg-accent/60"
        >
          {node.icon && <node.icon className="size-4 text-muted-foreground" />}
          <span className="text-sm">{node.label}</span>
          {node.badge && (
            <span className="ml-auto text-[10px] font-medium tracking-wide text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded">
              {node.badge}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (isDropdown(node)) {
    return (
      <SidebarMenuItem>
        <Collapsible className="group/collapsible">
          <CollapsibleTrigger
            render={
              <SidebarMenuButton className="gap-3 rounded-md transition-colors hover:bg-accent/60">
                {node.icon && (
                  <node.icon className="size-4 text-muted-foreground" />
                )}
                <span className="text-sm">{node.label}</span>
                <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            }
          />
          <CollapsibleContent>
            <SidebarMenuSub>
              {node.children.map((child, index) => (
                <NavigationNode
                  key={index}
                  node={child}
                  nested
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  }

  return null;
}

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
                <span className="font-display text-base tracking-tight">
                  DM Tools
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Data Ministry
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {sidebarMenus.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/60 font-medium px-2 mb-1">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.children.map((node, nodeIndex) => (
                  <NavigationNode
                    key={`${groupIndex}:${nodeIndex}`}
                    node={node}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
