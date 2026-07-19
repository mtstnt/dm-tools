"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { UserSession } from "@/actions/auth/session";

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
