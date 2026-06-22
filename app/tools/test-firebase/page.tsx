"use client"

import { useEffect, useState } from "react"
import { getApps } from "firebase/app"
import { getApp } from "firebase/app"

export default function TestFirebasePage() {
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const apps = getApps()
    setInitialized(apps.length > 0)
    // Debug: print firebase config and apps to browser console when deployed
    // eslint-disable-next-line no-console
    console.log("[test-firebase] NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
    // eslint-disable-next-line no-console
    console.log("[test-firebase] initialized apps:", apps.map((a) => a.name))
    try {
      // also attempt to read default app name (may throw if none)
      // eslint-disable-next-line no-console
      console.log("[test-firebase] default app:", getApp()?.name)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("[test-firebase] getApp() failed", e)
    }
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Tes 1 2 3</h1>
      <p className="mt-2">Status: {initialized ? "Initialized" : "Not initialized"}</p>
      <p className="mt-4 text-sm text-muted-foreground">cek</p>
    </div>
  )
}
