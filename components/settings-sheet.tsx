"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InstallAppCard } from "@/components/install-app-card"

interface SettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-6 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pengaturan</DialogTitle>
          <DialogDescription>
            Kelola preferensi aplikasi DM Tools di perangkat ini.
          </DialogDescription>
        </DialogHeader>

        <InstallAppCard />
      </DialogContent>
    </Dialog>
  )
}
