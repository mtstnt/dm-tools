"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { LogOut, User as UserIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AccountInfo() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  async function handleLogout() {
    await signOut(auth)
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-1.5">
        <div className="flex flex-col gap-1 items-end">
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="size-8 rounded-full bg-muted animate-pulse shrink-0" />
      </div>
    )
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent transition-colors outline-none">
        <div className="text-right min-w-0">
          <p className="text-xs font-medium text-foreground leading-tight truncate max-w-[140px]">
            {user.displayName || user.email?.split("@")[0]}
          </p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
            {user.email}
          </p>
        </div>
        <div className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground shrink-0">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <UserIcon className="size-3.5" />
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-none">
              {user.displayName || user.email?.split("@")[0]}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
