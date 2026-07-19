import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  Calendar,
  Calendar1,
  CalendarDays,
  Church,
  Cog,
  Globe,
  Hash,
  History,
  Home,
  Key,
  ScrollText,
  Settings,
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
  resource?: string;
};

export type NavigationDropdown = {
  type: "dropdown";
  label: string;
  icon?: LucideIcon;
  children: NavigationChild[];
  resource?: string;
};

export type NavigationChild = NavigationLink | NavigationDropdown;

export type NavigationGroup = {
  type: "group";
  title: string;
  children: NavigationChild[];
};

export type NavigationRootItem = NavigationGroup | NavigationChild;

export const sidebarMenus: NavigationRootItem[] = [
  {
    type: "link",
    label: "Home",
    targetLink: "/my/home",
    icon: Home,
  },
  {
    type: "group",
    title: "Data Entry",
    children: [
      {
        type: "link",
        label: "My Events",
        targetLink: "/my/events",
        icon: Calendar,
        resource: "events",
      },
      {
        type: "link",
        label: "All Events",
        targetLink: "/my/events",
        icon: CalendarDays,
        resource: "events",
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
    type: "group",
    title: "Master",
    children: [
      {
        type: "link",
        label: "Regions",
        targetLink: "/my/master/regions",
        icon: Globe,
        resource: "regions",
      },
      {
        type: "link",
        label: "Teams",
        targetLink: "/my/master/teams",
        icon: Users,
        resource: "teams",
      },
      {
        type: "link",
        label: "Event Types",
        targetLink: "/my/master/event-types",
        icon: Calendar1,
        resource: "event_types",
      },
      {
        type: "link",
        label: "Ministries",
        targetLink: "/my/master/ministries",
        icon: Church,
        resource: "ministries",
      },
      {
        type: "link",
        label: "Metrics",
        targetLink: "/my/master/metrics",
        icon: Calculator,
        resource: "metrics",
      },
      {
        type: "link",
        label: "Tasks",
        targetLink: "/my/master/tasks",
        icon: Workflow,
        resource: "tasks",
      },
      {
        type: "link",
        label: "Configurations",
        targetLink: "/my/master/configurations",
        icon: Settings,
        resource: "configurations",
      },
      {
        type: "link",
        label: "Audit Trails",
        targetLink: "/my/audit-trails",
        icon: ScrollText,
        resource: "audit_trails",
      },
    ],
  },
  {
    type: "group",
    title: "Team Management",
    children: [
      {
        type: "link",
        label: "Members",
        targetLink: "/my/users/members",
        icon: User,
        resource: "users",
      },
      {
        type: "link",
        label: "Permissions",
        targetLink: "/my/users/permissions",
        icon: Key,
        resource: "permissions",
      },
      {
        type: "link",
        label: "Roles",
        targetLink: "/my/users/roles",
        icon: SquareUser,
        resource: "roles",
      },
    ],
  },
  {
    type: "group",
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
      {
        type: "link",
        label: "Calendar",
        targetLink: "/tools/calendar",
        icon: Calendar,
      },
    ],
  },
  {
    type: "group",
    title: "Legacy SC Website",
    children: [
      {
        type: "link",
        label: "Events (Web SC)",
        targetLink: "/tools/legacy/events",
        icon: CalendarDays,
        resource: "events",
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
        resource: "users",
      },
    ],
  },
];