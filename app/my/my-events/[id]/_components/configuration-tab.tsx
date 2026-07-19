"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Loader2 } from "lucide-react"
import {
  getEventConfiguration,
  updateEventConfiguration,
  type EventConfiguration,
} from "@/actions/events"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type LoadStatus = "loading" | "ready" | "error"

export function ConfigurationTab({ eventId }: { eventId: number }) {
  const [status, setStatus] = useState<LoadStatus>("loading")
  const [configuration, setConfiguration] = useState<EventConfiguration[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function loadConfiguration() {
      const result = await getEventConfiguration(eventId)
      if (!result.success) {
        setError(result.error ?? "Failed to load configuration")
        setStatus("error")
        return
      }

      setConfiguration(result.data ?? [])
      setStatus("ready")
    }

    loadConfiguration()
  }, [eventId])

  function handleValueChange(index: number, value: string) {
    setConfiguration((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, value } : item,
      ),
    )
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const result = await updateEventConfiguration(eventId, configuration)
    setSaving(false)

    if (!result.success) {
      setError(result.error ?? "Failed to save configuration")
      return
    }

    setConfiguration(result.data ?? configuration)
    setSaved(true)
  }

  if (status === "loading") {
    return <div className="py-8 text-sm text-muted-foreground">Loading configuration...</div>
  }

  if (status === "error") {
    return <p className="py-8 text-sm text-destructive">{error}</p>
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="font-semibold">Configuration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the values configured for this event.
        </p>
      </div>

      {configuration.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No configuration fields have been set for this event.
        </p>
      ) : (
        <div className="space-y-4">
          {configuration.map((item, index) => (
            <div key={`${item.field}-${index}`} className="grid gap-2 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:items-center">
              <label htmlFor={`configuration-${index}`} className="text-sm font-medium">
                {item.field}
              </label>
              <Input
                id={`configuration-${index}`}
                value={item.value}
                onChange={(event) => handleValueChange(index, event.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end border-t pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {saved && !saving && <CheckCircle className="mr-2 size-4" />}
          {saving ? "Saving..." : saved ? "Saved" : "Save configuration"}
        </Button>
      </div>
    </div>
  )
}
