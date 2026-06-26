"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getWebAuthCookie } from "@/components/web-auth-guard"
import { fetchEventEditPage } from "@/lib/queries/events"
import { WebAuthGuard } from "@/components/web-auth-guard"

export default function EventsPageDummy() {

  const params = useParams()
  const eventId = params.eventId as string
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const f = async () => {
      console.log("Starting to hit API");
      setStatus("loading")
      try {
        const cookie = getWebAuthCookie()
        if (!cookie) throw new Error("Not authenticated")
        const details = await fetchEventEditPage(cookie, eventId)
        console.log("Details", details);
        setStatus("success")
      } catch (err) {
        console.error("fetchEventEditPage failed:", err);
        setStatus("error")
        setErrorMsg(err instanceof Error ? err.message : "Unknown error")
      }
    };
    f();
  }, []);

  return <>
    <WebAuthGuard>
      <div className="p-4">
        {status === "loading" && (
          <div className="text-muted-foreground animate-pulse">Loading event edit page...</div>
        )}
        {status === "success" && (
          <div className="text-green-600">✓ Fetch succeeded</div>
        )}
        {status === "error" && (
          <div className="text-destructive">✗ Fetch failed: {errorMsg}</div>
        )}
      </div>
    </WebAuthGuard>
  </>
}
