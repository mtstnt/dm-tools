"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCUS0o4FoOIJR0yNMTeVwKiQd5X8DXZSh8",
  authDomain: "dataministry-c1e34.firebaseapp.com",
  projectId: "dataministry-c1e34",
  storageBucket: "dataministry-c1e34.firebasestorage.app",
  messagingSenderId: "6966551131",
  appId: "1:6966551131:web:92922d586bf6e08433557e",
  measurementId: "G-HP7XW8L7E2"
}

if (!getApps().length) {
  initializeApp(firebaseConfig)
}

const app = getApp()
export const auth = getAuth(app)
export const db = getFirestore(app)

export default app
