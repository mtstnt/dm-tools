"use client"

import { useEffect } from "react"
import { initPwaInstallCapture } from "@/hooks/use-pwa-install"

let hasRegistered = false

export function RegisterServiceWorker() {
  useEffect(() => {
    initPwaInstallCapture()

    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return
    if (hasRegistered) return
    hasRegistered = true

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        hasRegistered = false
      })
    }

    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
    }
  }, [])

  return null
}
