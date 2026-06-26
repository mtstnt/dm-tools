"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getWebAuthCookie } from "@/components/web-auth-guard"
import { fetchEventEditPage, fetchEventShowPage } from "@/lib/queries/events"
import { WebAuthGuard } from "@/components/web-auth-guard"

type FetchStatus = "idle" | "loading" | "success" | "error"

export default function EventsPageDummy() {

  const params = useParams()
  const eventId = params.eventId as string
  const [editStatus, setEditStatus] = useState<FetchStatus>("idle")
  const [editError, setEditError] = useState("")
  const [showStatus, setShowStatus] = useState<FetchStatus>("idle")
  const [showError, setShowError] = useState("")

  useEffect(() => {
    const f = async () => {
      console.log("Starting to hit APIs in parallel")
      setEditStatus("loading")
      setShowStatus("loading")
      const cookie = getWebAuthCookie()
      if (!cookie) {
        setEditStatus("error")
        setEditError("Not authenticated")
        setShowStatus("error")
        setShowError("Not authenticated")
        return
      }

      const [editResult, showResult] = await Promise.allSettled([
        fetchEventEditPage(cookie, eventId),
        fetchEventShowPage(cookie, eventId),
      ])

      if (editResult.status === "fulfilled") {
        setEditStatus("success")
      } else {
        setEditStatus("error")
        setEditError(editResult.reason instanceof Error ? editResult.reason.message : "Unknown error")
      }

      if (showResult.status === "fulfilled") {
        setShowStatus("success")
      } else {
        setShowStatus("error")
        setShowError(showResult.reason instanceof Error ? showResult.reason.message : "Unknown error")
      }
    }
    f()
  }, [eventId])

  return <>
    <WebAuthGuard>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">Edit Page:</span>
          {editStatus === "loading" && <span className="text-muted-foreground animate-pulse">Loading...</span>}
          {editStatus === "success" && <span className="text-green-600">✓ Success</span>}
          {editStatus === "error" && <span className="text-destructive">✗ Failed: {editError}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Show Page:</span>
          {showStatus === "loading" && <span className="text-muted-foreground animate-pulse">Loading...</span>}
          {showStatus === "success" && <span className="text-green-600">✓ Success</span>}
          {showStatus === "error" && <span className="text-destructive">✗ Failed: {showError}</span>}
        </div>
      </div>
    </WebAuthGuard>
  </>
}
