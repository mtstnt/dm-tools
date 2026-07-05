"use client"

import { useRouter } from "next/navigation"
import { logout } from "@/actions/auth/login"
import { useSessionUser } from "@/components/user-session-provider"
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
  const user = useSessionUser()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push("/auth/login")
    router.refresh()
  }

  if (!user) return null

  return (
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
            {user.roles.length > 0 && (
              <p className="text-[11px] leading-none text-muted-foreground/70">
                {user.roles.join(", ")}
              </p>
            )}
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
