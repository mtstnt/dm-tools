import { redirect } from "next/navigation"

export default function DefaultMyPageRedirect() {
  redirect("/my/home")
  return <></>
}
