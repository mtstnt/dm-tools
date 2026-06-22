"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function setAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.set("authenticated", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
  redirect("/")
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("authenticated")
  redirect("/auth")
}
