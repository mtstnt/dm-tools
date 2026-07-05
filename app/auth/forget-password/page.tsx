import { redirect } from "next/navigation"

export default function ForgetPasswordPage() {
  redirect("/auth/login")
}
