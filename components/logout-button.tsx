"use client"

import { useRouter } from "next/navigation"
import { logout } from "@/actions/auth/login"
import { useSetSessionUser } from "@/components/user-session-provider"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const router = useRouter()
  const setSession = useSetSessionUser()

  async function handleLogout() {
    await signOut(auth).catch(() => {})
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
