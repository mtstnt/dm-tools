"use client";

import { useRouter } from "next/navigation";

export default function ToolsHomePage() {
  const router = useRouter();

  router.push("/tools/reports");

  return (<></>)
}
