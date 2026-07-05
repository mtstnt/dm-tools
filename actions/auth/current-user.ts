"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db/connection";
import { users } from "@/db/schema";

const AUTH_COOKIE = "authenticated";

export interface CurrentUser {
  id: number;
  fullName: string;
  email: string;
  nij: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(AUTH_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  const id = Number(userId);
  if (Number.isNaN(id)) {
    return null;
  }

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      nij: users.nij,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

export async function checkAuth(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
