"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type {
  UserSession,
  UserPermission,
} from "@/actions/auth/session";
import type { Action } from "@/db/schema";

const UserSessionContext = createContext<UserSession | null>(null);

export function UserSessionProvider({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: UserSession | null;
}) {
  const [session] = useState<UserSession | null>(initialSession);

  return (
    <UserSessionContext.Provider value={session}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useSessionUser(): UserSession | null {
  return useContext(UserSessionContext);
}

export function hasPermission(
  session: UserSession | null | undefined,
  resource: string,
  action: Action,
): boolean {
  if (!session) {
    return false;
  }

  if (session.roles.includes("ADMIN")) {
    return true;
  }

  return session.permissions.some(
    (permission: UserPermission) =>
      permission.resource === resource && permission.action === action,
  );
}
