"use client"

import { useCallback, useEffect, useState } from "react"

type PwaPlatform = "ios" | "android" | "desktop" | "unknown"

interface PwaInstallState {
  deferredPrompt: BeforeInstallPromptEvent | null
  isInstalled: boolean
}

const state: PwaInstallState = {
  deferredPrompt: null,
  isInstalled: false,
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

let initialized = false

export function initPwaInstallCapture() {
  if (initialized) return
  if (typeof window === "undefined") return
  initialized = true

  state.isInstalled =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    state.deferredPrompt = event
    emit()
  })

  window.addEventListener("appinstalled", () => {
    state.isInstalled = true
    state.deferredPrompt = null
    emit()
  })
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

interface UsePwaInstallResult {
  isInstallable: boolean
  isInstalled: boolean
  platform: PwaPlatform
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">
}

export function usePwaInstall(): UsePwaInstallResult {
  const [platform, setPlatform] = useState<PwaPlatform>("unknown")
  const [, setTick] = useState(0)

  useEffect(() => {
    initPwaInstallCapture()
    setPlatform(detectPlatform())

    const listener = () => setTick((tick) => tick + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!state.deferredPrompt) return "unavailable" as const
    await state.deferredPrompt.prompt()
    const choice = await state.deferredPrompt.userChoice
    state.deferredPrompt = null
    emit()
    return choice.outcome
  }, [])

  return {
    isInstallable: state.deferredPrompt !== null,
    isInstalled: state.isInstalled,
    platform,
    promptInstall,
  }
}
