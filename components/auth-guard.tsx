"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkAuth } from "@/actions/auth/login"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth().then((ok) => {
      if (!ok) {
        router.push("/auth/login")
        return
      }
      setAuthenticated(true)
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return <>{children}</>
}
