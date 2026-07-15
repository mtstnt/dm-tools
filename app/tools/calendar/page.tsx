"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type CalendarEvent = {
  id: number
  eventTypeName: string
  regionName: string
  date: Date
}

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

function buildSampleEvents(year: number, monthIndex: number, today: Date): CalendarEvent[] {
  if (year !== today.getFullYear() || monthIndex !== today.getMonth()) {
    return []
  }

  const region = "GMS Surabaya Selatan"
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const sundays: Date[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIndex, d)
    if (date.getDay() === 0) {
      sundays.push(date)
    }
  }

  const events: CalendarEvent[] = []

  sundays.forEach((date, index) => {
    events.push({
      id: index * 10 + 1,
      eventTypeName: "AOG TEEN",
      regionName: region,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0),
    })
    events.push({
      id: index * 10 + 2,
      eventTypeName: "AOG YOUTH",
      regionName: region,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0),
    })

    if (index === 1) {
      events.push({
        id: index * 10 + 3,
        eventTypeName: "CT YOUTH",
        regionName: region,
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 19, 30),
      })
    }
  })

  const prayerAnchor = sundays[2]
  if (prayerAnchor) {
    const prayerDate = new Date(
      prayerAnchor.getFullYear(),
      prayerAnchor.getMonth(),
      prayerAnchor.getDate() - 3,
      19,
      0,
    )
    events.push({
      id: 900,
      eventTypeName: "DOA WILAYAH",
      regionName: region,
      date: prayerDate,
    })
  }

  return events
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(today)

  const viewDate = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth])
  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const events = useMemo(
    () => buildSampleEvents(viewYear, viewMonth, today),
    [viewYear, viewMonth, today],
  )

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach((event) => {
      const key = dateKey(event.date)
      if (!map[key]) {
        map[key] = []
      }
      map[key].push(event)
    })
    return map
  }, [events])

  const selectedDayEvents = (eventsByDate[dateKey(selectedDate)] ?? [])
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())

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
        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>
      </div>

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
                {selectedDayEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      No events scheduled for this date.
                    </p>
                  </div>
                ) : (
                  selectedDayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
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
                        {format(event.date, "HH:mm")}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground/50">
                Sample data for preview — not yet connected to the live schedule.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}