import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Cog,
  FileText,
  Hash,
  History,
  Home,
  UserCheck,
  Users,
} from "lucide-react";

export type NavigationLink = {
  type: "link";
  label: string;
  targetLink: string;
  icon?: LucideIcon;
  badge?: string;
  adminOnly?: boolean;
};

export type NavigationDropdown = {
  type: "dropdown";
  label: string;
  icon?: LucideIcon;
  children: NavigationChild[];
  adminOnly?: boolean;
};

export type NavigationChild = NavigationLink | NavigationDropdown;

export type Group = {
  title: string;
  children: NavigationChild[];
};

export const sidebarMenus: Group[] = [
  {
    title: "Data Entry",
    children: [
      {
        type: "link",
        label: "Events",
        targetLink: "/tools/events",
        icon: CalendarDays,
      },
      {
        type: "link",
        label: "Team Members",
        targetLink: "/tools/events",
        icon: Users,
      },
      {
        type: "dropdown",
        label: "Reports",
        icon: FileText,
        children: [
          {
            type: "link",
            label: "History",
            targetLink: "/tools/reports-history",
            icon: History,
          },
        ],
      },
      {
        type: "link",
        label: "Doa Wilayah",
        targetLink: "/tools/doa-wilayah",
        icon: UserCheck,
      },
    ],
  },
  {
    title: "Utilities",
    children: [
      {
        type: "link",
        label: "Report Generator",
        targetLink: "/tools/reports",
        icon: Cog,
      },
      {
        type: "link",
        label: "Assign",
        targetLink: "/tools/assign",
        icon: UserCheck,
      },
      {
        type: "link",
        label: "Tally Counter",
        targetLink: "/tools/tally",
        icon: Hash,
      },
    ]
  },
  {
    title: "Legacy SC Website",
    children: [
      {
        type: "link",
        label: "Home",
        targetLink: "/tools",
        icon: Home,
      },
      {
        type: "link",
        label: "Events",
        targetLink: "/tools/events",
        icon: CalendarDays,
        badge: "Exp",
      },
      {
        type: "link",
        label: "Members",
        targetLink: "/tools/members",
        icon: UserCheck,
        adminOnly: true,
      },
    ],
  },
];
