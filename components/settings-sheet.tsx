"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { InstallAppCard } from "@/components/install-app-card"

interface SettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Pengaturan</SheetTitle>
          <SheetDescription>
            Kelola preferensi aplikasi DM Tools di perangkat ini.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <InstallAppCard />
        </div>
      </SheetContent>
    </Sheet>
  )
}
