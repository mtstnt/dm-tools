"use client"

import { useState, useEffect, useCallback, startTransition } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function RefreshCacheButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasSw, setHasSw] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const controller = navigator.serviceWorker?.controller
    startTransition(() => {
      setHasSw("serviceWorker" in navigator && !!controller)
    })
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        // Unregister current service worker
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((r) => r.unregister()))

        // Clear all caches
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((name) => caches.delete(name)))
      }

      // Reload to get fresh content
      window.location.reload()
    } catch {
      // Fallback: just reload
      window.location.reload()
    }
  }, [])

  if (!hasSw) return null

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          />
        }
      >
        <RefreshCw
          className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
        />
        <span className="sr-only">Refresh cache</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">Refresh cache</TooltipContent>
    </Tooltip>
  )
}
