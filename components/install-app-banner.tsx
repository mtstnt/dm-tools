"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePwaInstall } from "@/hooks/use-pwa-install"
import { SettingsSheet } from "@/components/settings-sheet"

const DISMISS_KEY = "dm-tools:install-banner-dismissed"

export function InstallAppBanner() {
  const { isInstallable, isInstalled, platform, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1")
  }, [])

  if (platform !== "ios" && platform !== "android") return null
  if (isInstalled) return null
  if (dismissed) return null

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1")
    setDismissed(true)
  }

  const handleInstallClick = async () => {
    if (platform === "ios" || !isInstallable) {
      setSettingsOpen(true)
      return
    }
    await promptInstall()
  }

  return (
    <>
      <div className="relative rounded-xl border border-amber-300 bg-amber-50 p-4 pr-10 dark:border-amber-400/30 dark:bg-amber-400/10">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          aria-label="Tutup"
          className="absolute right-2 top-2 text-amber-700 hover:bg-amber-200/60 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-400/20 dark:hover:text-amber-200"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
            <Download className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Pasang DM Tools di HP kamu
            </p>
            <p className="text-sm text-amber-800/90 dark:text-amber-200/80">
              Akses lebih cepat lewat home screen, tampil seperti aplikasi native.
            </p>
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="mt-3 border-transparent bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
            >
              Pasang
            </Button>
          </div>
        </div>
      </div>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
