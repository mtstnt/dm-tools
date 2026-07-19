"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { logout } from "@/actions/auth/login"
import { useSessionUser, useSetSessionUser } from "@/components/user-session-provider"
import { auth } from "@/lib/firebase/firebase"
import { signOut } from "firebase/auth"
import { LogOut, Settings, User as UserIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SettingsSheet } from "@/components/settings-sheet"

export function AccountInfo() {
  const user = useSessionUser()
  const setSession = useSetSessionUser()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function handleLogout() {
    await signOut(auth).catch(() => {})
    await logout()
    setSession(null)
    router.push("/auth/login")
    router.refresh()
  }

  if (!user) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent transition-colors outline-none">
          <div className="text-right min-w-0">
            <p className="text-xs font-medium text-foreground leading-tight truncate max-w-[140px]">
              {user.fullName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {user.email}
            </p>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground shrink-0">
            <UserIcon className="size-3.5" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium leading-none">
                {user.fullName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {user.role && (
                <p className="text-[11px] leading-none text-muted-foreground/70">
                  {user.role}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="size-4" />
            <span>Pengaturan</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="size-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
