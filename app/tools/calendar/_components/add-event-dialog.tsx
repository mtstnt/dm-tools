"use client"

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { format, formatISO, isValid, parse } from "date-fns"
import { CalendarPlus } from "lucide-react"
import {
  createCalendarEvent,
  getCalendarEventOptions,
  type CalendarEventOptionsData,
} from "@/actions/events"
import {
  EVENT_VISIBILITY_SCOPE_LABELS,
  type EventVisibilityScope,
} from "@/lib/permissions"
import { DATETIME_LOCAL_FORMAT } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/components/ui/multi-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AddEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: Date
  onCreated: () => void
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

function LockedValue({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/40 px-3 text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function toLocalDateTimeWithOffset(value: string) {
  if (!value) {
    return value
  }

  const date = parse(value, "yyyy-MM-dd'T'HH:mm", new Date())
  return isValid(date) ? formatISO(date) : value
}

export function AddEventDialog({
  open,
  onOpenChange,
  defaultDate,
  onCreated,
}: AddEventDialogProps) {
  const [options, setOptions] = useState<CalendarEventOptionsData | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [regionId, setRegionId] = useState("")
  const [eventTypeId, setEventTypeId] = useState("")
  const [customName, setCustomName] = useState("")
  const [date, setDate] = useState("")
  const [visibilityScope, setVisibilityScope] = useState<EventVisibilityScope | "">("")
  const [visibilityRegions, setVisibilityRegions] = useState<MultiSelectOption[]>([])
  const [visibilityTeams, setVisibilityTeams] = useState<MultiSelectOption[]>([])

  useEffect(() => {
    if (!open) return

    setLoadError(null)
    setFormError(null)
    setDate(format(defaultDate, DATETIME_LOCAL_FORMAT))
    setVisibilityScope("")
    setVisibilityRegions([])
    setVisibilityTeams([])
    setCustomName("")

    let mounted = true

    async function loadOptions() {
      setIsLoadingOptions(true)
      const result = await getCalendarEventOptions()

      if (!mounted) return

      if (result.success && result.data) {
        setOptions(result.data)
        setEventTypeId(result.data.eventTypes[0] ? String(result.data.eventTypes[0].id) : "")
        setVisibilityScope(result.data.allowedScopes[0] ?? "")

        if (result.data.regionChoiceLocked && result.data.ownRegion) {
          setRegionId(String(result.data.ownRegion.id))
        } else {
          setRegionId(result.data.regions[0] ? String(result.data.regions[0].id) : "")
        }
      } else {
        setLoadError(result.error ?? "Failed to load event options")
        setOptions(null)
      }

      setIsLoadingOptions(false)
    }

    loadOptions()

    return () => {
      mounted = false
    }
  }, [open, defaultDate])

  const eventTypeName = useMemo(() => {
    return options?.eventTypes.find((eventType) => String(eventType.id) === eventTypeId)?.name ?? ""
  }, [options, eventTypeId])

  const isCustomEvent = eventTypeName.trim().toUpperCase() === "CUSTOM"

  const regionOptions: MultiSelectOption[] = useMemo(() => {
    return (options?.regions ?? []).map((region) => ({
      value: String(region.id),
      label: region.name,
    }))
  }, [options])

  const teamOptions: MultiSelectOption[] = useMemo(() => {
    return (options?.teams ?? []).map((team) => ({
      value: String(team.id),
      label: `Team ${team.number} \u2013 ${team.regionName}`,
    }))
  }, [options])

  const needsRegionTarget = visibilityScope === "region" || visibilityScope === "region_spv"
  const needsTeamTarget = visibilityScope === "team"

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!options) {
      setFormError("Event options are not ready yet.")
      return
    }

    if (!regionId) {
      setFormError("Please select a region.")
      return
    }

    if (!eventTypeId) {
      setFormError("Please select an event type.")
      return
    }

    if (!date) {
      setFormError("Please select an event date.")
      return
    }

    if (isCustomEvent && customName.trim().length === 0) {
      setFormError("Please enter a custom event name.")
      return
    }

    if (!visibilityScope) {
      setFormError("Please select who can see this event.")
      return
    }

    if (needsRegionTarget && !options.regionChoiceLocked && visibilityRegions.length === 0) {
      setFormError("Please select at least one region for this visibility type.")
      return
    }

    if (needsTeamTarget && !options.teamChoiceLocked && visibilityTeams.length === 0) {
      setFormError("Please select at least one team for this visibility type.")
      return
    }

    setIsSubmitting(true)

    const result = await createCalendarEvent({
      regionId: Number(regionId),
      eventTypeId: Number(eventTypeId),
      customName: isCustomEvent ? customName.trim() : undefined,
      date: toLocalDateTimeWithOffset(date),
      visibilityScope,
      visibilityRegionIds: needsRegionTarget
        ? visibilityRegions.map((region) => Number(region.value))
        : [],
      visibilityTeamIds: needsTeamTarget
        ? visibilityTeams.map((team) => Number(team.value))
        : [],
    })

    setIsSubmitting(false)

    if (!result.success) {
      setFormError(result.error ?? "Failed to create event")
      return
    }

    onCreated()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
            <DialogDescription>
              Create a new event and choose who can see it in the calendar.
            </DialogDescription>
          </DialogHeader>

          {isLoadingOptions ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading form...
            </div>
          ) : !options ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {loadError ?? "Failed to load form"}
            </div>
          ) : options.allowedScopes.length === 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              You do not have permission to create events.
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Region">
                  {options.regionChoiceLocked ? (
                    <LockedValue>{options.ownRegion?.name ?? "Not assigned"}</LockedValue>
                  ) : (
                    <Select
                      value={regionId}
                      items={Object.fromEntries(
                        options.regions.map((region) => [String(region.id), region.name]),
                      )}
                      onValueChange={(value) => {
                        if (value) setRegionId(value)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.regions.map((region) => (
                          <SelectItem key={region.id} value={String(region.id)}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>

                <Field label="Event type">
                  <Select
                    value={eventTypeId}
                    items={Object.fromEntries(
                      options.eventTypes.map((eventType) => [String(eventType.id), eventType.name]),
                    )}
                    onValueChange={(value) => {
                      if (value) setEventTypeId(value)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.eventTypes.map((eventType) => (
                        <SelectItem key={eventType.id} value={String(eventType.id)}>
                          {eventType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {isCustomEvent ? (
                <Field label="Custom event name">
                  <Input
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                    placeholder="Example: Volunteer Appreciation Night"
                  />
                </Field>
              ) : null}

              <Field label="Event date & time">
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Field>

              <Field label="Visible to">
                <Select
                  value={visibilityScope}
                  items={Object.fromEntries(
                    options.allowedScopes.map((scope) => [scope, EVENT_VISIBILITY_SCOPE_LABELS[scope]]),
                  )}
                  onValueChange={(value) => {
                    if (value) setVisibilityScope(value as EventVisibilityScope)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.allowedScopes.map((scope) => (
                      <SelectItem key={scope} value={scope}>
                        {EVENT_VISIBILITY_SCOPE_LABELS[scope]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {needsRegionTarget ? (
                <Field label={visibilityScope === "region_spv" ? "SPV region" : "Region(s) allowed to view"}>
                  {options.regionChoiceLocked ? (
                    <LockedValue>{options.ownRegion?.name ?? "Not assigned"}</LockedValue>
                  ) : (
                    <MultiSelect
                      options={regionOptions}
                      value={visibilityRegions}
                      onChange={setVisibilityRegions}
                      placeholder="Search and select region(s)..."
                    />
                  )}
                </Field>
              ) : null}

              {needsTeamTarget ? (
                <Field label="Team allowed to view">
                  {options.teamChoiceLocked ? (
                    <LockedValue>
                      {options.ownTeam ? `Team ${options.ownTeam.number}` : "Not assigned"}
                    </LockedValue>
                  ) : (
                    <MultiSelect
                      options={teamOptions}
                      value={visibilityTeams}
                      onChange={setVisibilityTeams}
                      placeholder="Search and select team(s)..."
                    />
                  )}
                </Field>
              ) : null}

              {formError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoadingOptions || !options || options.allowedScopes.length === 0 || isSubmitting}
            >
              <CalendarPlus className="size-4" />
              {isSubmitting ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
