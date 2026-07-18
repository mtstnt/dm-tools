"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type ScheduleItem = {
  id: number
  eventTypeName: string
  regionName: string
  date: Date
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

function startOfWeek(date: Date): Date {
  const diffToMonday = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diffToMonday)
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function formatWeekRangeLabel(weekStart: Date, weekEnd: Date): string {
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()

  if (sameMonth && sameYear) {
    return `${weekStart.getDate()} \u2013 ${weekEnd.getDate()} ${MONTH_LABELS[weekStart.getMonth()]} ${weekStart.getFullYear()}`
  }

  if (sameYear) {
    return `${weekStart.getDate()} ${MONTH_LABELS[weekStart.getMonth()]} \u2013 ${weekEnd.getDate()} ${MONTH_LABELS[weekEnd.getMonth()]} ${weekStart.getFullYear()}`
  }

  return `${weekStart.getDate()} ${MONTH_LABELS[weekStart.getMonth()]} ${weekStart.getFullYear()} \u2013 ${weekEnd.getDate()} ${MONTH_LABELS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`
}

function buildSampleEvents(weekStart: Date, today: Date): Record<string, ScheduleItem[]> {
  const map: Record<string, ScheduleItem[]> = {}
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today))

  if (!isCurrentWeek) {
    return map
  }

  const saturday = addDays(weekStart, 5)
  const sunday = addDays(weekStart, 6)
  const region = "GMS Surabaya Selatan"

  map[dateKey(saturday)] = [
    {
      id: 1,
      eventTypeName: "DOA WILAYAH",
      regionName: region,
      date: new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate(), 19, 0),
    },
  ]

  map[dateKey(sunday)] = [
    {
      id: 2,
      eventTypeName: "AOG TEEN",
      regionName: region,
      date: new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 9, 0),
    },
    {
      id: 3,
      eventTypeName: "AOG YOUTH",
      regionName: region,
      date: new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 17, 0),
    },
  ]

  return map
}

export function ThisWeekWidget() {
  const today = useMemo(() => new Date(), [])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  )
  const weekEnd = weekDays[6]
  const eventsByDate = useMemo(() => buildSampleEvents(weekStart, today), [weekStart, today])

  function goToPrevWeek() {
    setWeekStart((current) => addDays(current, -7))
  }

  function goToNextWeek() {
    setWeekStart((current) => addDays(current, 7))
  }

  function goToThisWeek() {
    setWeekStart(startOfWeek(today))
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
              This Week
            </p>
            <p className="font-display mt-0.5 text-xl tracking-tight text-foreground">
              {formatWeekRangeLabel(weekStart, weekEnd)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={goToThisWeek}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToPrevWeek}
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToNextWeek}
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, index) => {
            const dayEvents = eventsByDate[dateKey(day)] ?? []
            const isToday = isSameDay(day, today)

            return (
              <Popover key={dateKey(day)}>
                <PopoverTrigger
                  openOnHover
                  aria-label={`${WEEKDAY_LABELS[index]} ${day.getDate()} ${MONTH_LABELS[day.getMonth()]}${dayEvents.length ? `, ${dayEvents.length} event` : ""}`}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg py-3 text-sm transition-colors",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium uppercase tracking-wide",
                      isToday ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {WEEKDAY_LABELS[index]}
                  </span>
                  <span className="font-mono text-base">{day.getDate()}</span>
                  <span className="flex h-1.5 items-center">
                    {dayEvents.length > 0 ? (
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          isToday ? "bg-primary-foreground" : "bg-primary",
                        )}
                      />
                    ) : null}
                  </span>
                </PopoverTrigger>
                <PopoverContent>
                  <PopoverHeader>
                    <PopoverTitle>
                      {WEEKDAY_LABELS[index]}, {day.getDate()} {MONTH_LABELS[day.getMonth()]}
                    </PopoverTitle>
                  </PopoverHeader>

                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No events scheduled.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="truncate font-medium text-foreground">
                            {event.eventTypeName}
                          </span>
                          <span className="font-mono shrink-0 text-muted-foreground">
                            {formatTime(event.date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/tools/calendar?date=${dateKey(day)}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    View in Calendar
                    <ArrowRight className="size-3" />
                  </Link>
                </PopoverContent>
              </Popover>
            )
          })}
        </div>

        <Link
          href="/tools/calendar"
          className="inline-flex items-center gap-1 self-end text-sm font-medium text-primary hover:underline"
        >
          View full calendar
          <ArrowRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  )
}