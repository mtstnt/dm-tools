"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function checkMagicWord(_prevState: unknown, formData: FormData) {
  const magicWord = formData.get("magic-word")
  const expectedWord = process.env.MAGIC_WORD

  if (magicWord === expectedWord) {
    const cookieStore = await cookies()
    cookieStore.set("authenticated", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })
    redirect("/")
  }

  return { error: "Incorrect magic word" }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("authenticated")
  redirect("/auth")
}
