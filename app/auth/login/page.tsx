"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { login } from "@/actions/auth/login"
import { getUserSession } from "@/actions/auth/session"
import { useSetSessionUser } from "@/components/user-session-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const setSession = useSetSessionUser()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setPending(true)

    const result = await login(email, password)
    if (result.success) {
      const session = await getUserSession()
      setSession(session)
      router.push("/")
      router.refresh()
    } else {
      setError(result.error ?? "Authentication failed")
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen relative">
      {/* Theme toggle - top right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Left panel - brand / hero */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10">
          <span className="text-primary-foreground/60 text-sm font-medium tracking-[0.08em] uppercase">
            Data Ministry
          </span>
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-primary-foreground text-5xl xl:text-6xl leading-[1.1] tracking-tight">
            Serve with
            <br />
            clarity.
          </h1>
          <p className="mt-6 text-primary-foreground/70 text-base max-w-sm leading-relaxed">
            Tools built for ministry teams who care about the details
            that make every service run smoothly.
          </p>
        </div>
        <div className="relative z-10">
          <p className="text-primary-foreground/40 text-xs">
            &copy; {new Date().getFullYear()} DM Tools
          </p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-page-enter">
          <div className="lg:hidden mb-10">
            <span className="text-muted-foreground text-sm font-medium tracking-[0.08em] uppercase">
              Data Ministry
            </span>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="font-display text-3xl tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm">
              Sign in to access your tools.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@church.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-card"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-card"
                required
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="w-full h-11 font-medium"
            >
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
