"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

import { db } from "@/db/connection";
import { users } from "@/db/schema";
import { getUserSession, type UserSession } from "@/actions/auth/session";
import { encryptFirebaseCredentials } from "@/lib/crypto/crypto";

const AUTH_COOKIE = "authenticated";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface LoginResult {
  success: boolean;
  error?: string;
  session?: UserSession | null;
  firebaseCredentials?: string | null;
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
      nij: users.nij,
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

  const session = await getUserSession();

  let firebaseCredentials: string | null = null;
  const firebaseEmail = process.env.FIREBASE_AUTH_EMAIL;
  const firebasePassword = process.env.FIREBASE_AUTH_PASSWORD;
  if (firebaseEmail && firebasePassword) {
    try {
      firebaseCredentials = await encryptFirebaseCredentials(
        firebaseEmail,
        firebasePassword,
      );
    } catch (err) {
      console.error("[login] Firebase credentials encryption failed:", err);
    }
  }

  return { success: true, session, firebaseCredentials };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}
