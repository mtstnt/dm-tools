"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarPlus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { getEventSchedule, type EventScheduleItem } from "@/actions/events"
import { useSessionUser } from "@/components/user-session-provider"
import { ROLES, canAccess } from "@/lib/permissions"
import { AddEventDialog } from "@/app/tools/calendar/_components/add-event-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type CalendarCell = {
  date: Date
  inCurrentMonth: boolean
}

const WEEKDAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1)
  const startWeekday = firstOfMonth.getDay()
  const gridStart = new Date(year, monthIndex, 1 - startWeekday)
  const cells: CalendarCell[] = []

  for (let i = 0; i < 42; i++) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    )
    cells.push({ date, inCurrentMonth: date.getMonth() === monthIndex })
  }

  return cells
}

export default function CalendarPage() {
  const session = useSessionUser()
  const canAddEvent = canAccess(session?.role, [
    ROLES.ADMIN,
    ROLES.HEAD_MINISTRY,
    ROLES.REGIONAL_PIC,
    ROLES.SPV,
  ])

  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(today)
  const [events, setEvents] = useState<EventScheduleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddEventOpen, setIsAddEventOpen] = useState(false)

  const viewDate = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth])
  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])

  const requestIdRef = useRef(0)

  const loadEvents = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setIsLoading(true)
    const result = await getEventSchedule(viewMonth, viewYear)

    if (requestIdRef.current !== requestId) return

    setIsLoading(false)

    if (!result.success) {
      setError(result.error ?? "Failed to load events")
      setEvents([])
      return
    }

    setError(null)
    setEvents(result.data ?? [])
  }, [viewMonth, viewYear])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventScheduleItem[]> = {}

    events.forEach((event) => {
      const key = dateKey(new Date(event.date))
      if (!map[key]) {
        map[key] = []
      }
      map[key].push(event)
    })

    return map
  }, [events])

  const selectedDayEvents = (eventsByDate[dateKey(selectedDate)] ?? [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  function goToMonth(year: number, monthIndex: number) {
    const next = new Date(year, monthIndex, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  function handleSelectDay(cell: CalendarCell) {
    setSelectedDate(cell.date)
    if (!cell.inCurrentMonth) {
      goToMonth(cell.date.getFullYear(), cell.date.getMonth())
    }
  }

  function handleToday() {
    goToMonth(today.getFullYear(), today.getMonth())
    setSelectedDate(today)
  }

  return (
    <div className="flex flex-col gap-8 animate-stagger">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.1]">
            Calendar
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Browse the monthly service and event schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          {canAddEvent ? (
            <Button size="sm" onClick={() => setIsAddEventOpen(true)}>
              <CalendarPlus className="size-4" />
              Add Event
            </Button>
          ) : null}
        </div>
      </div>

      {canAddEvent ? (
        <AddEventDialog
          open={isAddEventOpen}
          onOpenChange={setIsAddEventOpen}
          defaultDate={selectedDate}
          onCreated={loadEvents}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => goToMonth(viewYear - 1, viewMonth)}
                    aria-label="Previous year"
                  >
                    <ChevronsLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => goToMonth(viewYear, viewMonth - 1)}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>

                <div className="text-center">
                  <p className="font-display text-2xl tracking-tight text-foreground">
                    {format(viewDate, "MMMM", { locale: id })}
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {format(viewDate, "yyyy")}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => goToMonth(viewYear, viewMonth + 1)}
                    aria-label="Next month"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => goToMonth(viewYear + 1, viewMonth)}
                    aria-label="Next year"
                  >
                    <ChevronsRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="pb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}

                {cells.map((cell) => {
                  const isToday = isSameDay(cell.date, today)
                  const isSelected = isSameDay(cell.date, selectedDate)
                  const dayEvents = eventsByDate[dateKey(cell.date)] ?? []

                  return (
                    <button
                      key={cell.date.toISOString()}
                      type="button"
                      onClick={() => handleSelectDay(cell)}
                      aria-label={`${format(cell.date, "d MMMM yyyy", { locale: id })}${dayEvents.length ? `, ${dayEvents.length} event` : ""}`}
                      aria-pressed={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      className={cn(
                        "relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors",
                        !cell.inCurrentMonth && !isSelected && "text-muted-foreground/40 hover:bg-muted/50",
                        cell.inCurrentMonth && !isSelected && "text-foreground hover:bg-muted",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected && isToday && "ring-1 ring-inset ring-primary",
                      )}
                    >
                      <span className="font-mono text-sm">{cell.date.getDate()}</span>
                      {dayEvents.length > 0 ? (
                        <span className="flex h-1.5 items-center gap-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <span
                              key={event.id}
                              className={cn(
                                "size-1.5 rounded-full",
                                isSelected ? "bg-primary-foreground" : "bg-primary",
                              )}
                            />
                          ))}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card className="xl:sticky xl:top-20">
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium tracking-[0.08em] uppercase text-muted-foreground/60">
                  Schedule
                </p>
                <p className="font-display text-xl tracking-tight text-foreground mt-0.5">
                  {format(selectedDate, "EEEE, d MMMM yyyy", { locale: id })}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {isLoading ? (
                  <>
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                  </>
                ) : error ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-6 text-center text-sm text-destructive">
                    {error}
                  </div>
                ) : selectedDayEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      No events scheduled for this date.
                    </p>
                  </div>
                ) : (
                  selectedDayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/my/events/${event.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                    >
                      <span className="size-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {event.eventTypeName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {event.regionName}
                        </p>
                      </div>
                      <span className="font-mono shrink-0 text-xs text-muted-foreground">
                        {format(new Date(event.date), "HH:mm")}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
