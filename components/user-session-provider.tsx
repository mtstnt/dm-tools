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
