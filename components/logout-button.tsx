"use client"

import { useRouter } from "next/navigation"
import { logout } from "@/actions/auth/login"
import { useSetSessionUser } from "@/components/user-session-provider"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const router = useRouter()
  const setSession = useSetSessionUser()

  async function handleLogout() {
    await logout()
    setSession(null)
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <form action={handleLogout}>
      <SidebarMenuButton type="submit">
        <LogOut />
        <span>Logout</span>
      </SidebarMenuButton>
    </form>
  )
}
