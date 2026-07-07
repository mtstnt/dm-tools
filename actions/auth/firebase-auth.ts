"use server";

import { encryptFirebaseCredentials } from "@/lib/crypto";

export async function getFirebaseCredentials(): Promise<string | null> {
  const firebaseEmail = process.env.FIREBASE_AUTH_EMAIL;
  const firebasePassword = process.env.FIREBASE_AUTH_PASSWORD;

  if (!firebaseEmail || !firebasePassword) {
    return null;
  }

  try {
    return await encryptFirebaseCredentials(firebaseEmail, firebasePassword);
  } catch (err) {
    console.error("[getFirebaseCredentials] encryption failed:", err);
    return null;
  }
}
