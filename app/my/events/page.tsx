"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarPlus,
  CirclePlus,
  Filter,
  GraduationCap,
  MapPin,
  Moon,
  Sparkles,
} from "lucide-react";
import { getEventSchedule, type EventScheduleItem } from "@/actions/events";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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

const iconStyles = [
  {
    icon: GraduationCap,
    className: "bg-primary text-primary-foreground",
  },
  {
    icon: BriefcaseBusiness,
    className: "bg-secondary text-secondary-foreground",
  },
  {
    icon: Sparkles,
    className: "bg-accent text-accent-foreground",
  },
  {
    icon: Moon,
    className: "bg-muted text-muted-foreground",
  },
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

export default function EventsPage() {
  const [events, setEvents] = useState<EventScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setEvents(result.data?.length ? result.data : DUMMY_EVENTS);
      }

      setIsLoading(false);
    }

    loadEvents();

    return () => {
      mounted = false;
    };
  }, []);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, { date: Date; events: EventScheduleItem[] }>();

    for (const event of events) {
      const date = new Date(event.date);
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
  }, [events]);

  return (
    <div className="min-h-full rounded-[28px] bg-background p-4 text-foreground md:p-6">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Events Schedule (still dummy data)
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
            <section
              key={dateKey(group.date)}
              className="min-h-[17rem] space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Badge className="h-7 rounded-md bg-primary px-3 text-[11px] font-bold tracking-wide text-primary-foreground hover:bg-primary">
                  {formatDatePill(group.date)}
                </Badge>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-2.5">
                {group.events.map((event, index) => (
                  <EventCard key={event.id} event={event} toneIndex={index} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  toneIndex,
}: {
  event: EventScheduleItem;
  toneIndex: number;
}) {
  const tone = iconStyles[toneIndex % iconStyles.length];
  const Icon = tone.icon;
  const date = new Date(event.date);

  return (
    <article className="group flex flex-col gap-4 rounded-lg border border-border bg-background p-4 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-lg shadow-sm",
            tone.className,
          )}
        >
          <Icon className="size-5" />
        </div>

        <div>
          <Link
            href={`/my/events/${event.id}`}
            className="text-base font-semibold tracking-normal hover:text-primary"
          >
            {event.name} / {formatTime(date)}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {event.regionName}
            </span>
            <span>{event.eventTypeName}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
        <Link
          href={`/my/events/${event.id}`}
          className="flex size-7 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary"
          aria-label={`Open ${event.name}`}
        >
          <CirclePlus className="size-4" />
        </Link>
      </div>
    </article>
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

const DUMMY_EVENTS: EventScheduleItem[] = [
  {
    id: 1001,
    name: "AOG Teen",
    date: new Date(2026, 6, 4, 16, 0),
    regionName: "GMS Surabaya Selatan",
    eventTypeName: "Youth Service",
    requiresApplication: false,
    teams: [
      { id: 7, number: 7 },
      { id: 8, number: 8 },
    ],
  },
  {
    id: 1002,
    name: "Saturday Service",
    date: new Date(2026, 6, 4, 18, 0),
    regionName: "GMS Surabaya Selatan",
    eventTypeName: "Weekend Service",
    requiresApplication: true,
    teams: [],
  },
  {
    id: 1003,
    name: "Sunday Morning",
    date: new Date(2026, 6, 5, 8, 0),
    regionName: "GMS Surabaya Pusat",
    eventTypeName: "Sunday Service",
    requiresApplication: false,
    teams: [
      { id: 10, number: 10 },
      { id: 11, number: 11 },
    ],
  },
  {
    id: 1004,
    name: "Youth Service",
    date: new Date(2026, 6, 5, 17, 0),
    regionName: "GMS Surabaya Selatan",
    eventTypeName: "Youth Service",
    requiresApplication: false,
    teams: [{ id: 12, number: 12 }],
  },
  {
    id: 1005,
    name: "Morning Prayer",
    date: new Date(2026, 6, 7, 5, 30),
    regionName: "GMS Surabaya Barat",
    eventTypeName: "Prayer Meeting",
    requiresApplication: false,
    teams: [{ id: 3, number: 3 }],
  },
  {
    id: 1006,
    name: "Campus Gathering",
    date: new Date(2026, 6, 7, 19, 0),
    regionName: "GMS Surabaya Timur",
    eventTypeName: "Community",
    requiresApplication: false,
    teams: [
      { id: 4, number: 4 },
      { id: 5, number: 5 },
    ],
  },
  {
    id: 1007,
    name: "Midweek Service",
    date: new Date(2026, 6, 9, 19, 0),
    regionName: "GMS Surabaya Pusat",
    eventTypeName: "Midweek Service",
    requiresApplication: false,
    teams: [{ id: 1, number: 1 }],
  },
  {
    id: 1008,
    name: "Volunteer Briefing",
    date: new Date(2026, 6, 11, 10, 0),
    regionName: "GMS Surabaya Selatan",
    eventTypeName: "Training",
    requiresApplication: true,
    teams: [],
  },
  {
    id: 1009,
    name: "Sunday Celebration",
    date: new Date(2026, 6, 12, 9, 0),
    regionName: "GMS Surabaya Barat",
    eventTypeName: "Sunday Service",
    requiresApplication: false,
    teams: [
      { id: 2, number: 2 },
      { id: 6, number: 6 },
    ],
  },
  {
    id: 1010,
    name: "Kids Ministry",
    date: new Date(2026, 6, 12, 11, 0),
    regionName: "GMS Surabaya Barat",
    eventTypeName: "Kids Service",
    requiresApplication: false,
    teams: [{ id: 9, number: 9 }],
  },
  {
    id: 1011,
    name: "Creative Night",
    date: new Date(2026, 6, 15, 18, 30),
    regionName: "GMS Surabaya Pusat",
    eventTypeName: "Creative",
    requiresApplication: false,
    teams: [{ id: 13, number: 13 }],
  },
  {
    id: 1012,
    name: "Leadership Class",
    date: new Date(2026, 6, 15, 20, 0),
    regionName: "GMS Surabaya Selatan",
    eventTypeName: "Class",
    requiresApplication: true,
    teams: [],
  },
  {
    id: 1013,
    name: "Healing Service",
    date: new Date(2026, 6, 18, 17, 0),
    regionName: "GMS Surabaya Timur",
    eventTypeName: "Special Service",
    requiresApplication: false,
    teams: [
      { id: 14, number: 14 },
      { id: 15, number: 15 },
    ],
  },
  {
    id: 1014,
    name: "Saturday Worship",
    date: new Date(2026, 6, 18, 19, 0),
    regionName: "GMS Surabaya Pusat",
    eventTypeName: "Weekend Service",
    requiresApplication: false,
    teams: [{ id: 16, number: 16 }],
  },
  {
    id: 1015,
    name: "Sunday Evening",
    date: new Date(2026, 6, 19, 18, 0),
    regionName: "GMS Surabaya Selatan",
    eventTypeName: "Sunday Service",
    requiresApplication: false,
    teams: [{ id: 17, number: 17 }],
  },
  {
    id: 1016,
    name: "Marketplace Talk",
    date: new Date(2026, 6, 22, 19, 30),
    regionName: "GMS Surabaya Barat",
    eventTypeName: "Seminar",
    requiresApplication: true,
    teams: [],
  },
  {
    id: 1017,
    name: "Prayer Tower",
    date: new Date(2026, 6, 24, 21, 0),
    regionName: "GMS Surabaya Pusat",
    eventTypeName: "Prayer Meeting",
    requiresApplication: false,
    teams: [{ id: 18, number: 18 }],
  },
  {
    id: 1018,
    name: "Family Service",
    date: new Date(2026, 6, 26, 10, 0),
    regionName: "GMS Surabaya Selatan",
    eventTypeName: "Sunday Service",
    requiresApplication: false,
    teams: [
      { id: 19, number: 19 },
      { id: 20, number: 20 },
    ],
  },
  {
    id: 1019,
    name: "Young Adults",
    date: new Date(2026, 6, 29, 19, 0),
    regionName: "GMS Surabaya Timur",
    eventTypeName: "Community",
    requiresApplication: false,
    teams: [{ id: 21, number: 21 }],
  },
  {
    id: 1020,
    name: "Revival Night",
    date: new Date(2026, 6, 31, 19, 0),
    regionName: "GMS Surabaya Pusat",
    eventTypeName: "Special Service",
    requiresApplication: false,
    teams: [
      { id: 22, number: 22 },
      { id: 23, number: 23 },
      { id: 24, number: 24 },
    ],
  },
];
