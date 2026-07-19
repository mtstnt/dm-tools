"use client"

import { useState, type ReactElement, type ReactNode } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings } from "lucide-react"
import { SettingsSheet } from "@/components/settings-sheet"

interface AccountMenuProps {
  trigger: ReactElement
  triggerIsNativeButton?: boolean
  label?: string
  children?: ReactNode
}

export function AccountMenu({
  trigger,
  triggerIsNativeButton = true,
  label,
  children,
}: AccountMenuProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={trigger} nativeButton={triggerIsNativeButton} />
        <DropdownMenuContent align="end" className="w-56">
          {label ? (
            <>
              <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                {label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Pengaturan
          </DropdownMenuItem>
          {children ? (
            <>
              <DropdownMenuSeparator />
              {children}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
