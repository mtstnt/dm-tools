"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { getEventSchedule, type EventScheduleItem } from "@/actions/events";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MEI",
  "JUN",
  "JUL",
  "AGU",
  "SEP",
  "OKT",
  "NOV",
  "DES",
];

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const FULL_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDatePill(date: Date) {
  return `${DAYS[date.getDay()].toLocaleUpperCase()}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatEventDateTime(date: Date) {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${FULL_MONTHS[date.getMonth()]} ${date.getFullYear()} ${formatTime(date)}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [expandedDateKeys, setExpandedDateKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      setIsLoading(true);
      const result = await getEventSchedule();

      if (!mounted) {
        return;
      }

      if (!result.success) {
        setError(result.error ?? "Failed to load events");
        setEvents([]);
      } else {
        setError(null);
        setEvents(result.data ?? []);
      }

      setIsLoading(false);
    }

    loadEvents();

    return () => {
      mounted = false;
    };
  }, []);

  const yearOptions = useMemo(() => {
    const years = new Set(events.map((event) => new Date(event.date).getFullYear()));
    years.add(selectedYear);

    return Array.from(years).sort((a, b) => a - b);
  }, [events, selectedYear]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, { date: Date; events: EventScheduleItem[] }>();

    for (const event of events) {
      const date = new Date(event.date);

      if (date.getMonth() !== selectedMonth || date.getFullYear() !== selectedYear) {
        continue;
      }

      const key = dateKey(date);
      const group = groups.get(key);

      if (group) {
        group.events.push(event);
      } else {
        groups.set(key, { date, events: [event] });
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [events, selectedMonth, selectedYear]);

  function moveMonth(direction: -1 | 1) {
    const nextDate = new Date(selectedYear, selectedMonth + direction, 1);
    setSelectedMonth(nextDate.getMonth());
    setSelectedYear(nextDate.getFullYear());
    setExpandedDateKeys(new Set());
  }

  function changeMonth(month: number) {
    setSelectedMonth(month);
    setExpandedDateKeys(new Set());
  }

  function changeYear(year: number) {
    setSelectedYear(year);
    setExpandedDateKeys(new Set());
  }

  function toggleDateGroup(key: string) {
    setExpandedDateKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  return (
    <div className="min-h-full rounded-[28px] bg-background text-foreground md:p-6">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Events Schedule
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and assign teams for upcoming organizational services and events.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="shadow-sm">
            <Filter className="size-4" />
            Filter
          </Button>
          <Link
            href="/my/events/new"
            className={cn(buttonVariants(), "shadow-sm")}
          >
            <CalendarPlus className="size-4" />
            Add Event
          </Link>
        </div>
      </div>

      <div className="mb-7 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Periode Event</p>
          <p className="text-xs text-muted-foreground">
            {FULL_MONTHS[selectedMonth]} {selectedYear}
          </p>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => moveMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Select
            value={String(selectedMonth)}
            onValueChange={(value) => changeMonth(Number(value))}
            items={Object.fromEntries(
              FULL_MONTHS.map((month, index) => [String(index), month]),
            )}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {FULL_MONTHS.map((month, index) => (
                <SelectItem key={month} value={String(index)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(selectedYear)}
            onValueChange={(value) => changeYear(Number(value))}
            items={Object.fromEntries(yearOptions.map((year) => [String(year), String(year)]))}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <EventsSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          {error}
        </div>
      ) : groupedEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No events scheduled yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {groupedEvents.map((group) => (
            <Card
              key={dateKey(group.date)}
              className="min-h-[17rem] gap-0 rounded-xl bg-card py-0 shadow-sm"
            >
              <CardHeader className="px-3 pt-3 pb-0">
                <div className="flex items-center gap-3">
                  <Badge className="h-7 rounded-md bg-primary px-3 text-[11px] font-bold tracking-wide text-primary-foreground hover:bg-primary">
                    {formatDatePill(group.date)}
                  </Badge>
                  <div className="h-px flex-1 bg-border" />
                  <Badge className="h-6 min-w-6 rounded-full bg-primary px-2 text-[11px] font-semibold text-primary-foreground hover:bg-primary">
                    {group.events.length}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5 px-3 pt-3 pb-3">
                <DateGroupEvents
                  groupKey={dateKey(group.date)}
                  events={group.events}
                  isExpanded={expandedDateKeys.has(dateKey(group.date))}
                  onToggle={toggleDateGroup}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DateGroupEvents({
  groupKey,
  events,
  isExpanded,
  onToggle,
}: {
  groupKey: string;
  events: EventScheduleItem[];
  isExpanded: boolean;
  onToggle: (key: string) => void;
}) {
  const visibleEvents = isExpanded ? events : events.slice(0, 3);
  const hiddenCount = events.length - 3;

  return (
    <div className="space-y-2.5">
      {visibleEvents.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}

      {hiddenCount > 0 ? (
        <Button
          variant="outline"
          className="mt-1 w-full"
          onClick={() => onToggle(groupKey)}
        >
          {isExpanded ? "Show fewer events" : `Show all events (${events.length})`}
        </Button>
      ) : null}
    </div>
  );
}

function EventCard({
  event,
}: {
  event: EventScheduleItem;
}) {
  const router = useRouter();
  const date = new Date(event.date);

  function openEvent() {
    router.push(`/my/events/${event.id}`);
  }

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={openEvent}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openEvent();
        }
      }}
      className="group cursor-pointer gap-0 rounded-lg bg-background py-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 pt-4 pb-0">
        <CardTitle className="text-base font-semibold tracking-normal">
          {event.eventTypeName}
        </CardTitle>
        <CardDescription className="text-xs font-medium">
          {event.regionName} | {formatEventDateTime(date)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pt-2 pb-4">
        <div className="flex min-h-7 flex-wrap items-center gap-2">
          {event.requiresApplication ? (
            <Badge className="h-7 rounded-full bg-destructive/10 px-4 text-[11px] font-medium text-destructive hover:bg-destructive/10">
              ! Requires Application
            </Badge>
          ) : (
            event.teams.map((team) => (
              <Badge
                key={team.id}
                className="h-7 rounded-full bg-accent px-4 text-[11px] font-medium text-accent-foreground hover:bg-accent"
              >
                Team {team.number}
              </Badge>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
function EventsSkeleton() {
  return (
    <div className="space-y-8">
      {[0, 1].map((group) => (
        <div key={group} className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-7 w-24 rounded-md" />
            <Skeleton className="h-px flex-1" />
          </div>
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-[74px] rounded-xl bg-card" />
          ))}
        </div>
      ))}
    </div>
  );
}
