// Custom Firebase-related type augmentations.
// Keep these separate from next-env.d.ts (which is auto-generated).

declare global {
  interface Window {
    __FIREBASE_APP__?: import("firebase/app").FirebaseApp
  }
}

export {}
