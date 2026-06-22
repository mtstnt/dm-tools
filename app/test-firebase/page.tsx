"use client"

import { useEffect, useState } from "react"
import { getApps } from "firebase/app"

export default function TestFirebasePage() {
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    setInitialized(getApps().length > 0)
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Tes 1 2 3</h1>
      <p className="mt-2">Status: {initialized ? "Initialized" : "Not initialized"}</p>
      <p className="mt-4 text-sm text-muted-foreground">cek</p>
    </div>
  )
}
