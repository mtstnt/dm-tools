"use client"

import { useRouter } from "next/navigation"
import { logout } from "@/actions/auth/login"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await logout()
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
