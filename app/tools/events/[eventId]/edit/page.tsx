"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getWebAuthCookie } from "@/components/web-auth-guard"
import { fetchEventEditPage } from "@/lib/queries/events"
import { WebAuthGuard } from "@/components/web-auth-guard"

type FetchStatus = "idle" | "loading" | "success" | "error"

export default function EventsPageDummy() {
  const params = useParams()
  const eventId = params.eventId as string
  const [status, setStatus] = useState<FetchStatus>("idle")
  const [error, setError] = useState("")
  const [result, setResult] = useState<unknown>(null)

  useEffect(() => {
    const f = async () => {
      setStatus("loading")
      const cookie = getWebAuthCookie()
      if (!cookie) {
        setStatus("error")
        setError("Not authenticated")
        return
      }

      try {
        const data = await fetchEventEditPage(cookie, eventId)
        setResult(data)
        setStatus("success")
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "Unknown error")
      }
    }
    f()
  }, [eventId])

  return (
    <WebAuthGuard>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">Edit Page:</span>
          {status === "loading" && <span className="text-muted-foreground animate-pulse">Loading...</span>}
          {status === "success" && <span className="text-green-600">✓ Success</span>}
          {status === "error" && <span className="text-destructive">✗ Failed: {error}</span>}
        </div>
        {result !== null && (
          <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[600px]">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </WebAuthGuard>
  )
}
