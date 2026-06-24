"use client"

import { CalendarDays } from "lucide-react"
import { WebAuthGuard, clearWebAuth } from "@/components/web-auth-guard"
import { Button } from "@/components/ui/button"

export default function EventsPage() {
  return (
    <WebAuthGuard>
      <div className="max-w-3xl animate-stagger">
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.1]">
                Events
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Manage events from sc.gms.church.{" "}
                <span className="text-muted-foreground/60">
                  Experimental
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearWebAuth()
                window.location.reload()
              }}
            >
              Sign out
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-accent text-accent-foreground mb-4">
            <CalendarDays className="size-7" />
          </div>
          <h2 className="font-display text-xl text-foreground">Coming soon</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Event management features will appear here. You are authenticated
            with sc.gms.church.
          </p>
        </div>
      </div>
    </WebAuthGuard>
  )
}
