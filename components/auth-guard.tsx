"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkAuth } from "@/actions/auth/current-user"
import { Loader } from "lucide-react"

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
      <div className="flex min-h-full flex-1 items-center justify-center">
        <Loader className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return <>{children}</>
}
