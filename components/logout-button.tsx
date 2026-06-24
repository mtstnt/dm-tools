"use client"

import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await signOut(auth)
    router.push("/auth/login")
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
