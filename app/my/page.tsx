"use client";

import { useRouter } from "next/navigation"

export default function RegionsPage() {
  const navigate = useRouter();
  navigate.replace("/my/home")
  return <></>
}
