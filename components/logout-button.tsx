"use client"

import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"
import { logout } from "@/app/actions"

export function LogoutButton() {
  async function handleLogout() {
    await signOut(auth)
    await logout()
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
