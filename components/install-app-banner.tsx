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
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Pasang DM Tools di HP kamu</p>
          <p className="text-sm text-muted-foreground">
            Akses lebih cepat lewat home screen, tampil seperti aplikasi native.
          </p>
        </div>
        <Button size="sm" onClick={handleInstallClick} className="shrink-0">
          Pasang
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          aria-label="Tutup"
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
