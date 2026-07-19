"use client"

import { useState } from "react"
import { Check, Download, PlusSquare, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePwaInstall } from "@/hooks/use-pwa-install"

export function InstallAppCard() {
  const { isInstallable, isInstalled, platform, promptInstall } = usePwaInstall()
  const [wasDismissed, setWasDismissed] = useState(false)

  if (platform !== "ios" && platform !== "android") {
    return null
  }

  const handleInstall = async () => {
    const outcome = await promptInstall()
    setWasDismissed(outcome === "dismissed")
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">Aplikasi</h3>

      {isInstalled ? (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Aplikasi sudah terpasang</p>
              <p className="text-sm text-muted-foreground">
                DM Tools berjalan sebagai aplikasi di perangkat ini.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : platform === "ios" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pasang di iPhone / iPad</CardTitle>
            <CardDescription>
              Safari belum mendukung pemasangan otomatis. Ikuti langkah berikut:
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                1
              </div>
              <p className="flex items-center gap-1.5">
                Tap tombol <Share className="h-4 w-4" /> Share di Safari
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                2
              </div>
              <p className="flex items-center gap-1.5">
                Pilih <PlusSquare className="h-4 w-4" /> Add to Home Screen
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                3
              </div>
              <p>Tap Add untuk konfirmasi</p>
            </div>
          </CardContent>
        </Card>
      ) : isInstallable ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pasang DM Tools</CardTitle>
            <CardDescription>
              Akses lebih cepat lewat home screen, tampil seperti aplikasi native.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={handleInstall} className="gap-2">
              <Download className="h-4 w-4" />
              Pasang Aplikasi
            </Button>
            {wasDismissed ? (
              <p className="text-sm text-muted-foreground">
                Pemasangan dibatalkan. Kamu bisa coba lagi kapan saja dari sini.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Buka menu browser dan pilih &quot;Add to Home Screen&quot; atau &quot;Install
              App&quot; untuk memasang DM Tools di perangkat ini.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
