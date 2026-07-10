"use client"

import { useEffect } from "react"
import { useSessionUser } from "@/components/user-session-provider"
import { decryptFirebaseCredentials } from "@/lib/crypto/crypto-client"
import { auth } from "@/lib/firebase/firebase"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth"

export function FirebaseAuthInitializer() {
  const session = useSessionUser()

  useEffect(() => {
    if (!session?.firebaseCredentials) return

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await user.getIdToken(true)
        } catch (err) {
          console.error("[FirebaseAuthInitializer] token refresh failed:", err)
        }
        return
      }

      try {
        const decrypted = await decryptFirebaseCredentials(
          session.firebaseCredentials!,
        )
        const [fbEmail, fbPassword] = decrypted.split("%")
        if (fbEmail && fbPassword) {
          await setPersistence(auth, browserLocalPersistence)
          await signInWithEmailAndPassword(auth, fbEmail, fbPassword)
        }
      } catch (err) {
        console.error("[FirebaseAuthInitializer] Firebase sign-in failed:", err)
      }
    })

    return () => unsubscribe()
  }, [session?.firebaseCredentials])

  return null
}
