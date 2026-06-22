"use client"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { setAuthCookie } from "../actions"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setPending(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      await setAuthCookie()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed"
      setError(message)
      setPending(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
          <h1 className="text-xl font-medium text-foreground">Login</h1>
          <Input
            name="email"
            type="email"
            placeholder="Email"
            className="text-center"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            className="text-center"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  )
}
