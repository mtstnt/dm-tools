import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  Calendar1,
  CalendarDays,
  Church,
  Cog,
  FileText,
  Globe,
  Hash,
  History,
  Home,
  Key,
  SquareUser,
  User,
  UserCheck,
  Users,
  Workflow,
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
        targetLink: "/my/events",
        icon: CalendarDays,
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
    title: "Master",
    children: [
      {
        type: "link",
        label: "Regions",
        targetLink: "/my/master/regions",
        icon: Globe,
      },
      {
        type: "link",
        label: "Teams",
        targetLink: "/my/master/teams",
        icon: Users,
      },
      {
        type: "link",
        label: "Event Types",
        targetLink: "/my/master/event-types",
        icon: Calendar1,
      },
      {
        type: "link",
        label: "Ministries",
        targetLink: "/my/master/ministries",
        icon: Church,
      },
      {
        type: "link",
        label: "Metrics",
        targetLink: "/my/master/metrics",
        icon: Calculator,
      },
      {
        type: "link",
        label: "Tasks",
        targetLink: "/my/master/tasks",
        icon: Workflow,
      },
    ],
  },
  {
    title: "Team Management",
    children: [
      {
        type: "link",
        label: "Members",
        targetLink: "/my/users/members",
        icon: User,
      },
      {
        type: "link",
        label: "Permissions",
        targetLink: "/my/users/permissions",
        icon: Key,
      },
      {
        type: "link",
        label: "Roles",
        targetLink: "/my/users/roles",
        icon: SquareUser,
      },
    ],
  },
  {
    title: "Utilities",
    children: [
      {
        type: "link",
        label: "Report Generator",
        targetLink: "/tools/utilities/reports",
        icon: Cog,
      },
      {
        type: "link",
        label: "Assign",
        targetLink: "/tools/utilities/assign",
        icon: UserCheck,
      },
      {
        type: "link",
        label: "Tally Counter",
        targetLink: "/tools/utilities/tally",
        icon: Hash,
      },
    ]
  },
  {
    title: "Legacy SC Website",
    children: [
      {
        type: "link",
        label: "Events (Web SC)",
        targetLink: "/tools/legacy/events",
        icon: CalendarDays,
      },
      {
        type: "link",
        label: "Report History (Firebase)",
        targetLink: "/tools/reports-history",
        icon: History,
      },
      {
        type: "link",
        label: "Members (Firebase)",
        targetLink: "/tools/members",
        icon: UserCheck,
        adminOnly: true,
      },
    ],
  },
];
