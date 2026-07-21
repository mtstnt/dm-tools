"use client";

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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, LayoutGrid } from "lucide-react";
import {
  sidebarMenus,
  type NavigationChild,
  type NavigationGroup,
  type NavigationRootItem,
} from "@/lib/navigation";
import {
  useSessionUser,
} from "@/components/user-session-provider";
import type { UserSession } from "@/actions/auth/session";
import { canAccess } from "@/lib/permissions";
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

function isNavigationGroup(
  item: NavigationRootItem,
): item is NavigationGroup {
  return item.type === "group";
}

function isNodeVisible(
  session: UserSession | null,
  node: NavigationChild,
): boolean {
  if (isDropdown(node)) {
    if (node.allowedRoles && !canAccess(session?.role, node.allowedRoles)) {
      return false;
    }
    return node.children.some((child) => isNodeVisible(session, child));
  }

  if (isLink(node) && node.allowedRoles) {
    return canAccess(session?.role, node.allowedRoles);
  }

  return true;
}

function NavigationNode({
  node,
  nested = false,
}: {
  node: NavigationChild;
  nested?: boolean;
}) {
  const session = useSessionUser();
  const { setOpenMobile } = useSidebar();

  if (!isNodeVisible(session, node)) {
    return null;
  }

  if (isLink(node)) {
    if (nested) {
      return (
        <SidebarMenuSubItem>
          <SidebarMenuSubButton
            render={<Link href={node.targetLink} />}
            onClick={() => setOpenMobile(false)}
          >
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
          onClick={() => setOpenMobile(false)}
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
    const visibleChildren = node.children.filter((child) =>
      isNodeVisible(session, child),
    );

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
              {visibleChildren.map((child, index) => (
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
  const session = useSessionUser();
  const { setOpenMobile } = useSidebar();

  function isGroupVisible(group: NavigationGroup): boolean {
    return group.children.some((child) => isNodeVisible(session, child));
  }

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
                  <SidebarMenuButton size="lg" render={<Link href="/tools" />} onClick={() => setOpenMobile(false)}>
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
        {sidebarMenus.map((item, itemIndex) => {
          if (isNavigationGroup(item)) {
            if (!isGroupVisible(item)) {
              return null;
            }

            return (
              <SidebarGroup key={itemIndex}>
                <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/60 font-medium px-2 mb-1">
                  {item.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {item.children
                      .filter((child) => isNodeVisible(session, child))
                      .map((node, nodeIndex) => (
                        <NavigationNode
                          key={`${itemIndex}:${nodeIndex}`}
                          node={node}
                        />
                      ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          if (!isNodeVisible(session, item)) {
            return null;
          }

          return (
            <SidebarGroup key={itemIndex}>
              <SidebarGroupContent>
                <SidebarMenu>
                  <NavigationNode node={item} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
