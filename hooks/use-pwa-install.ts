"use client"

import { useCallback, useEffect, useState } from "react"

type PwaPlatform = "ios" | "android" | "desktop" | "unknown"

interface UsePwaInstallResult {
  isInstallable: boolean
  isInstalled: boolean
  platform: PwaPlatform
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">
}

function detectPlatform(): PwaPlatform {
  if (typeof navigator === "undefined") return "unknown"
  const ua = navigator.userAgent
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  if (isIOS) return "ios"
  if (/android/i.test(ua)) return "android"
  if (/win|mac|linux/i.test(navigator.platform ?? "")) return "desktop"
  return "unknown"
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false
  const isStandaloneDisplay = window.matchMedia("(display-mode: standalone)").matches
  return isStandaloneDisplay || window.navigator.standalone === true
}

export function usePwaInstall(): UsePwaInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [platform, setPlatform] = useState<PwaPlatform>("unknown")

  useEffect(() => {
    setPlatform(detectPlatform())
    setIsInstalled(detectStandalone())

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return choice.outcome
  }, [deferredPrompt])

  return {
    isInstallable: deferredPrompt !== null,
    isInstalled,
    platform,
    promptInstall,
  }
}
