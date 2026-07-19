"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  getEventRecapSummary,
  getUserRecapEvents,
  type EventRecapSummaryItem,
  type UserRecapEvent,
} from "@/actions/events/recap";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-xl border border-border">
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EventRecapPage() {
  const [summary, setSummary] = useState<EventRecapSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [expandedUserIds, setExpandedUserIds] = useState<Set<number>>(new Set());
  const [loadingUserIds, setLoadingUserIds] = useState<Set<number>>(new Set());

  const [eventsCache, setEventsCache] = useState<Map<number, UserRecapEvent[]>>(new Map());

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      const result = await getEventRecapSummary(selectedYear);

      if (!mounted) return;

      if (!result.success) {
        setError(result.error ?? "Failed to load event recap");
        setSummary([]);
      } else {
        setSummary(result.data ?? []);
      }

      setIsLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [selectedYear]);

  useEffect(() => {
    setEventsCache(new Map());
    setExpandedUserIds(new Set());
    setLoadingUserIds(new Set());
  }, [selectedYear]);

  const toggleExpand = useCallback(
    (userId: number) => {
      setExpandedUserIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    for (const userId of expandedUserIds) {
      if (!eventsCache.has(userId) && !loadingUserIds.has(userId)) {
        setLoadingUserIds((prev) => new Set(prev).add(userId));

        getUserRecapEvents(userId, selectedYear).then((result) => {
          if (result.success && result.data) {
            setEventsCache((prev) => new Map(prev).set(userId, result.data!));
          }
          setLoadingUserIds((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        });
      }
    }
  }, [expandedUserIds, eventsCache, loadingUserIds, selectedYear]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-full rounded-[28px] bg-background text-foreground">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Event Recap
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Participation summary for non-mandatory events in {selectedYear}.
          </p>
        </div>
      </div>

      <div className="mb-7 flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
        <p className="text-sm font-medium">
          {summary.length} member{summary.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-background hover:bg-muted"
            aria-label="Previous year"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-16 text-center text-sm font-semibold">
            {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear((y) => y + 1)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-background hover:bg-muted"
            aria-label="Next year"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {summary.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No participation data for {selectedYear}.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Full Name</TableHead>
                <TableHead>NIJ</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Participations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((item) => {
                const isExpanded = expandedUserIds.has(item.userId);
                const isLoadingEvents = loadingUserIds.has(item.userId);
                const events = eventsCache.get(item.userId);

                return (
                  <Fragment key={item.userId}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => toggleExpand(item.userId)}
                    >
                      <TableCell>
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.fullName}
                      </TableCell>
                      <TableCell>{item.nij}</TableCell>
                      <TableCell>
                        {item.teamNumber != null ? `Team ${item.teamNumber}` : "-"}
                      </TableCell>
                      <TableCell>{item.roleName ?? "-"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.participationCount}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30">
                          {isLoadingEvents ? (
                            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />
                              Loading events...
                            </div>
                          ) : events && events.length > 0 ? (
                            <div className="flex flex-wrap gap-2 py-2">
                              {events.map((event) => (
                                <Badge key={event.eventId} variant="secondary">
                                  <a
                                    href={`/my/events/${event.eventId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {event.eventName} /{" "}
                                    {format(event.eventDate, "d MMM yyyy")}
                                  </a>
                                  {event.isPic && (
                                    <span className="ml-1 font-semibold">
                                      (PIC)
                                    </span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="py-2 text-sm text-muted-foreground">
                              No events found.
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
