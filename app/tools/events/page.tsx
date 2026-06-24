"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, Lock, Unlock, RefreshCw } from "lucide-react"
import { WebAuthGuard, clearWebAuth, getWebAuthCookie } from "@/components/web-auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchEvents, eventKeys, type Event } from "@/lib/queries/events"

const MONTH_MAP: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
}

function parseDate(dateStr: string): number {
  const parts = dateStr.split(" ")
  if (parts.length < 3) return 0
  const day = parseInt(parts[0], 10)
  const month = MONTH_MAP[parts[1].toUpperCase()] ?? 0
  const year = parseInt(parts[2], 10)
  return new Date(year, month, day).getTime()
}

export default function EventsPage() {
  return (
    <WebAuthGuard>
      <div className="animate-stagger">
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.1]">
                Events
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Manage events.{" "}
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

        <EventsGrid />
      </div>
    </WebAuthGuard>
  )
}

function EventsGrid() {
  const {
    data: events,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: eventKeys.all,
    queryFn: () => {
      const cookie = getWebAuthCookie()
      if (!cookie) throw new Error("Not authenticated")
      return fetchEvents(cookie)
    },
  })

  const sorted = useMemo(() => {
    if (!events) return []
    return [...events].sort((a, b) => parseDate(b.date ?? "") - parseDate(a.date ?? ""))
  }, [events])

  const uniqueLocations = useMemo(() => {
    const set = new Set(sorted.map((e) => e.location).filter(Boolean) as string[])
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [sorted])

  const uniqueNames = useMemo(() => {
    const set = new Set(sorted.map((e) => e.eventName).filter(Boolean) as string[])
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [sorted])

  const uniqueDates = useMemo(() => {
    const set = new Set(sorted.map((e) => e.date).filter(Boolean) as string[])
    return [...set].sort((a, b) => parseDate(b) - parseDate(a))
  }, [sorted])

  const [locationFilter, setLocationFilter] = useState<string>("")
  const [nameFilter, setNameFilter] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("")

  const handleLocationChange = (v: string | null) => setLocationFilter(v ?? "")
  const handleNameChange = (v: string | null) => setNameFilter(v ?? "")
  const handleDateChange = (v: string | null) => setDateFilter(v ?? "")

  const filtered = useMemo(() => {
    return sorted.filter((e) => {
      if (locationFilter && e.location !== locationFilter) return false
      if (nameFilter && e.eventName !== nameFilter) return false
      if (dateFilter && e.date !== dateFilter) return false
      return true
    })
  }, [sorted, locationFilter, nameFilter, dateFilter])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-32" />
            </CardContent>
            <CardFooter>
              <div className="flex gap-2 w-full">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="max-w-md">
        <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
          <CalendarDays className="size-8 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load events</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3.5 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!events || events.length === 0) {
    return (
      <Card className="max-w-md">
        <CardContent className="py-12 text-center text-muted-foreground">
          No events found.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={locationFilter} onValueChange={handleLocationChange}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All locations</SelectItem>
            {uniqueLocations.map((loc) => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={nameFilter} onValueChange={handleNameChange}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Event name" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All events</SelectItem>
            {uniqueNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={handleDateChange}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All dates</SelectItem>
            {uniqueDates.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(locationFilter || nameFilter || dateFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocationFilter("")
              setNameFilter("")
              setDateFilter("")
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== events.length && ` of ${events.length}`}
      </p>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No events match the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map((event: Event) => (
            <EventCard key={event.id ?? `${event.date}-${event.eventName}`} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event }: { event: Event }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug">
            {event.eventName ?? "Untitled"}
          </CardTitle>
          {event.locked ? (
            <Lock className="size-4 text-destructive shrink-0" />
          ) : (
            <Unlock className="size-4 text-emerald-500 shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {event.date ?? "-"}
          </Badge>
          {event.time && (
            <span className="text-xs text-muted-foreground">{event.time}</span>
          )}
        </div>
        {event.location && (
          <p className="text-xs text-muted-foreground">{event.location}</p>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex gap-2 w-full">
          {event.seatCountUrl && (
            <a
              href={`${process.env.NEXT_PUBLIC_SC_BASE_URL}${event.seatCountUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 flex-1 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all hover:bg-muted hover:text-foreground"
            >
              Seats
            </a>
          )}
          {event.editUrl && (
            <a
              href={`${process.env.NEXT_PUBLIC_SC_BASE_URL}${event.editUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 flex-1 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all hover:bg-muted hover:text-foreground"
            >
              Edit
            </a>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
