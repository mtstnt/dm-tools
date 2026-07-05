"use client"

import { useState } from "react"
import { webLogin } from "@/actions/legacy-web/auth/web-login"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader } from "lucide-react"

const STORAGE_KEYS = {
  email: "web-auth-email",
  password: "web-auth-password",
  cookie: "web-auth-cookie",
} as const

export function clearWebAuth() {
  localStorage.removeItem(STORAGE_KEYS.email)
  localStorage.removeItem(STORAGE_KEYS.password)
  localStorage.removeItem(STORAGE_KEYS.cookie)
}

export function getWebAuthCookie(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(STORAGE_KEYS.cookie)
}

export function getWebAuthEmail(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(STORAGE_KEYS.email)
}

export function WebAuthGuard({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => {
    const storedEmail = localStorage.getItem(STORAGE_KEYS.email)
    const storedPassword = localStorage.getItem(STORAGE_KEYS.password)
    const storedCookie = localStorage.getItem(STORAGE_KEYS.cookie)

    return !!(storedEmail && storedPassword && storedCookie);
  })
  const [checking, setChecking] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setPending(true)

    const encodedPassword = btoa(password)
    const result = await webLogin(email, encodedPassword)

    if (result.success) {
      localStorage.setItem(STORAGE_KEYS.email, email)
      localStorage.setItem(STORAGE_KEYS.password, encodedPassword)
      localStorage.setItem(STORAGE_KEYS.cookie, result.cookie)
      setAuthenticated(true)
    } else {
      setError(result.error || "Login failed")
      setPending(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center">
        <Loader className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (authenticated) {
    return <>{children}</>
  }

  return (
    <div className="max-w-sm mx-auto py-12">
      <h2 className="font-display text-2xl tracking-tight mb-1">Web Authentication</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Sign in with your credentials to access Events.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="web-auth-email"
            className="text-sm font-medium text-foreground"
          >
            Email
          </label>
          <Input
            id="web-auth-email"
            type="email"
            placeholder="name@church.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="web-auth-password"
            className="text-sm font-medium text-foreground"
          >
            Password
          </label>
          <Input
            id="web-auth-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  )
}
