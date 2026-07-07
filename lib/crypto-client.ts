"use client";

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getKey(): Promise<CryptoKey> {
  const keyBase64 = process.env.NEXT_PUBLIC_FIREBASE_AUTH_ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error("NEXT_PUBLIC_FIREBASE_AUTH_ENCRYPTION_KEY is not set");
  }
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  return crypto.subtle.importKey("raw", keyBuffer, "AES-GCM", false, [
    "decrypt",
  ]);
}

export async function decryptFirebaseCredentials(
  encrypted: string,
): Promise<string> {
  const key = await getKey();
  const [ivBase64, dataBase64] = encrypted.split(":");
  if (!ivBase64 || !dataBase64) {
    throw new Error("Invalid encrypted credentials format");
  }

  const iv = base64ToArrayBuffer(ivBase64);
  const ciphertext = base64ToArrayBuffer(dataBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
