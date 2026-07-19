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
  ScrollText,
  Settings,
  SquareUser,
  User,
  UserCheck,
  Users,
  Workflow,
} from "lucide-react";
import { ROLES, type Role } from "@/lib/permissions";

export type NavigationLink = {
  type: "link";
  label: string;
  targetLink: string;
  icon?: LucideIcon;
  badge?: string;
  allowedRoles?: Role[];
};

export type NavigationDropdown = {
  type: "dropdown";
  label: string;
  icon?: LucideIcon;
  children: NavigationChild[];
  allowedRoles?: Role[];
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
        label: "Events",
        targetLink: "/my/events",
        icon: Calendar,
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV, ROLES.MEMBER],
      },
      {
        type: "link",
        label: "Schedules",
        targetLink: "/my/schedules",
        icon: Users,
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV, ROLES.MEMBER],
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
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY],
      },
      {
        type: "link",
        label: "Teams",
        targetLink: "/my/master/teams",
        icon: Users,
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC],
      },
      {
        type: "link",
        label: "Event Types",
        targetLink: "/my/master/event-types",
        icon: Calendar1,
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC],
      },
      {
        type: "link",
        label: "Ministries",
        targetLink: "/my/master/ministries",
        icon: Church,
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC],
      },
      {
        type: "link",
        label: "Metrics",
        targetLink: "/my/master/metrics",
        icon: Calculator,
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC],
      },
      {
        type: "link",
        label: "Tasks",
        targetLink: "/my/master/tasks",
        icon: Workflow,
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC],
      },
      {
        type: "link",
        label: "Configurations",
        targetLink: "/my/master/configurations",
        icon: Settings,
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY],
      },
      {
        type: "link",
        label: "Audit Trails",
        targetLink: "/my/audit-trails",
        icon: ScrollText,
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY],
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
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV],
      },
      {
        type: "link",
        label: "Roles",
        targetLink: "/my/users/roles",
        icon: SquareUser,
        allowedRoles: [ROLES.ADMIN],
      },
      {
        type: "link",
        label: "Role Assignments",
        targetLink: "/my/users/role-assignments",
        icon: UserCheck,
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC],
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
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV, ROLES.MEMBER],
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
        allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV],
      },
    ],
  },
];