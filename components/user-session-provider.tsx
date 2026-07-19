"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { UserSession } from "@/actions/auth/session";
import { ROLES } from "@/lib/permissions";

type UserSessionContextValue = {
  session: UserSession | null;
  setSession: (session: UserSession | null) => void;
};

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

export function UserSessionProvider({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: UserSession | null;
}) {
  const [session, setSession] = useState<UserSession | null>(initialSession);

  return (
    <UserSessionContext.Provider value={{ session, setSession }}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useSessionUser(): UserSession | null {
  const ctx = useContext(UserSessionContext);
  return ctx?.session ?? null;
}

export function useSetSessionUser(): (
  session: UserSession | null,
) => void {
  const ctx = useContext(UserSessionContext);
  if (!ctx) {
    throw new Error(
      "useSetSessionUser must be used within UserSessionProvider",
    );
  }
  return ctx.setSession;
}

const rolePermissionMap: Record<string, Record<string, Record<string, boolean>>> = {
  [ROLES.HEAD_MINISTRY]: {
    events: { read: true, create: true, update: true, delete: true },
    regions: { read: true, create: true, update: true, delete: true },
    teams: { read: true, create: true, update: true, delete: true },
    event_types: { read: true, create: true, update: true, delete: true },
    ministries: { read: true, create: true, update: true, delete: true },
    metrics: { read: true, create: true, update: true, delete: true },
    tasks: { read: true, create: true, update: true, delete: true },
    configurations: { read: true, create: true, update: true, delete: true },
    users: { read: true, create: true, update: true, delete: true },
    roles: { read: true },
    schedules: { read: true },
  },
  [ROLES.REGIONAL_PIC]: {
    events: { read: true, create: true, update: true, delete: true },
    teams: { read: true },
    users: { read: true },
    event_teams: { read: true },
    event_assignments: { read: true },
    schedules: { read: true },
  },
  [ROLES.SPV]: {
    events: { read: true, update: true },
    users: { read: true },
    teams: { read: true },
    event_teams: { read: true },
    event_assignments: { read: true, create: true, update: true, delete: true },
    event_volunteers: { read: true, create: true, update: true, delete: true },
    event_metrics: { read: true, create: true, update: true, delete: true },
    event_altar_calls: { read: true, create: true, update: true, delete: true },
    event_assignment_change_requests: { read: true, create: true, update: true, delete: true },
    schedules: { read: true },
  },
  [ROLES.MEMBER]: {
    events: { read: true },
    event_teams: { read: true },
    schedules: { read: true },
  },
};

export function hasPermission(
  session: UserSession | null,
  resource: string,
  action: string,
): boolean {
  if (!session) return false;
  if (session.role === ROLES.ADMIN) return true;
  return rolePermissionMap[session.role ?? ""]?.[resource]?.[action] ?? false;
}
