"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

import { db } from "@/db/connection";
import { users } from "@/db/schema";

const AUTH_COOKIE = "authenticated";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface CurrentUser {
  id: number;
  fullName: string;
  email: string;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      password: users.password,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (rows.length === 0) {
    return { success: false, error: "Invalid email or password" };
  }

  const user = rows[0];

  if (!user.password) {
    return { success: false, error: "Invalid email or password" };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { success: false, error: "Invalid email or password" };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, String(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });

  return { success: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
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
