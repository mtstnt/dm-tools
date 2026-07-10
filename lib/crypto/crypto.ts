"use server";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const keyBase64 = process.env.NEXT_PUBLIC_FIREBASE_AUTH_ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error("NEXT_PUBLIC_FIREBASE_AUTH_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_AUTH_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  }
  return key;
}

export async function encryptFirebaseCredentials(
  firebaseEmail: string,
  firebasePassword: string,
): Promise<string> {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const plaintext = `${firebaseEmail}%${firebasePassword}`;

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv):base64(ciphertext+authTag)
  return `${iv.toString("base64")}:${Buffer.concat([encrypted, authTag]).toString("base64")}`;
}

export async function decryptFirebaseCredentials(
  encrypted: string,
): Promise<string> {
  const key = getKey();
  const [ivBase64, dataBase64] = encrypted.split(":");
  if (!ivBase64 || !dataBase64) {
    throw new Error("Invalid encrypted credentials format");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const data = Buffer.from(dataBase64, "base64");

  // GCM: last 16 bytes are the auth tag
  const authTag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(0, data.length - 16);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
