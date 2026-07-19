"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isPast } from "date-fns";
import { id } from "date-fns/locale";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Loader,
  X,
} from "lucide-react";
import { getSchedules, getSwapRequests, approveSwap, rejectSwap, requestSwap, getAvailableReplacements, type ScheduleEvent, type ScheduleMember, type SwapRequestItem, type ReplacementUser } from "@/actions/schedules";
import { getEventScheduleYears } from "@/actions/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MONTHS_ID } from "@/lib/constants";
import { useSessionUser } from "@/components/user-session-provider";
import { ROLES } from "@/lib/permissions";

const FULL_MONTHS = MONTHS_ID;

function sortMembers(members: ScheduleMember[]): ScheduleMember[] {
  return [...members].sort((a, b) => {
    const aTeam = a.teamNumber ?? 999;
    const bTeam = b.teamNumber ?? 999;
    if (aTeam !== bTeam) return aTeam - bTeam;
    if (a.isSpv !== b.isSpv) return a.isSpv ? -1 : 1;
    return a.fullName.localeCompare(b.fullName);
  });
}

export default function SchedulesPage() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [yearOptions, setYearOptions] = useState<number[]>(() => [new Date().getFullYear()]);
  const [activeTab, setActiveTab] = useState<"assignments" | "swaps">("assignments");

  const session = useSessionUser();
  const canSwap = session?.role === ROLES.ADMIN || session?.role === ROLES.REGIONAL_PIC || session?.role === ROLES.SPV;
  const canApprove = session?.role === ROLES.ADMIN || session?.role === ROLES.SPV;

  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swappingMember, setSwappingMember] = useState<{ eventId: number; member: ScheduleMember } | null>(null);
  const [replacements, setReplacements] = useState<ReplacementUser[]>([]);
  const [selectedReplacement, setSelectedReplacement] = useState<string>("");
  const [replacementsLoading, setReplacementsLoading] = useState(false);
  const [swapPending, setSwapPending] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const [swapRequests, setSwapRequests] = useState<SwapRequestItem[]>([]);
  const [swapRequestsLoading, setSwapRequestsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadYears() {
      const result = await getEventScheduleYears();
      if (!mounted) return;
      if (result.success && result.data && result.data.length > 0) {
        setYearOptions(result.data);
      }
    }
    loadYears();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadEvents() {
      setIsLoading(true);
      const result = await getSchedules(selectedMonth, selectedYear);
      if (!mounted) return;
      if (!result.success) {
        setError(result.error ?? "Failed to load schedules");
        setEvents([]);
      } else {
        setError(null);
        setEvents(result.data ?? []);
      }
      setIsLoading(false);
    }
    loadEvents();
    return () => { mounted = false; };
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (activeTab !== "swaps") return;
    let mounted = true;
    async function loadSwapRequests() {
      setSwapRequestsLoading(true);
      const result = await getSwapRequests(selectedMonth, selectedYear);
      if (!mounted) return;
      if (result.success && result.data) {
        setSwapRequests(result.data);
      }
      setSwapRequestsLoading(false);
    }
    loadSwapRequests();
    return () => { mounted = false; };
  }, [activeTab, selectedMonth, selectedYear]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  const yearSelectOptions = useMemo(() => {
    const years = new Set(yearOptions);
    years.add(selectedYear);
    return Array.from(years).sort((a, b) => a - b);
  }, [yearOptions, selectedYear]);

  function moveMonth(direction: -1 | 1) {
    const nextDate = new Date(selectedYear, selectedMonth + direction, 1);
    setSelectedMonth(nextDate.getMonth());
    setSelectedYear(nextDate.getFullYear());
  }

  function changeMonth(month: number) {
    setSelectedMonth(month);
  }

  function changeYear(year: number) {
    setSelectedYear(year);
  }

  async function openSwapDialog(eventId: number, member: ScheduleMember) {
    setSwappingMember({ eventId, member });
    setSelectedReplacement("");
    setSwapError(null);
    setReplacements([]);
    setReplacementsLoading(true);
    setSwapDialogOpen(true);
    const result = await getAvailableReplacements(eventId, member.userId);
    if (result.success && result.data) {
      setReplacements(result.data);
    }
    setReplacementsLoading(false);
  }

  async function handleSwap() {
    if (!swappingMember || !selectedReplacement) return;
    setSwapPending(true);
    setSwapError(null);
    const result = await requestSwap(
      swappingMember.eventId,
      swappingMember.member.userId,
      Number(selectedReplacement),
    );
    setSwapPending(false);
    if (!result.success) {
      setSwapError(result.error ?? "Failed to request swap");
      return;
    }
    setSwapDialogOpen(false);
    setSwappingMember(null);
    const refreshed = await getSchedules(selectedMonth, selectedYear);
    if (refreshed.success && refreshed.data) {
      setEvents(refreshed.data);
    }
  }

  async function refreshSwapRequests() {
    const result = await getSwapRequests(selectedMonth, selectedYear);
    if (result.success && result.data) {
      setSwapRequests(result.data);
    }
  }

  async function handleApprove(requestId: number) {
    const result = await approveSwap(requestId);
    if (!result.success) return;
    const [schedulesResult] = await Promise.all([
      getSchedules(selectedMonth, selectedYear),
      refreshSwapRequests(),
    ]);
    if (schedulesResult.success && schedulesResult.data) {
      setEvents(schedulesResult.data);
    }
  }

  async function handleReject(requestId: number) {
    const result = await rejectSwap(requestId);
    if (!result.success) return;
    await refreshSwapRequests();
  }

  return (
    <div className="min-h-full rounded-[28px] bg-background text-foreground">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Schedules</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View event assignments and manage member swaps.
          </p>
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
          <Button variant="outline" size="icon-sm" onClick={() => moveMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <Select
            value={String(selectedMonth)}
            onValueChange={(value) => changeMonth(Number(value))}
            items={Object.fromEntries(FULL_MONTHS.map((month, index) => [String(index), month]))}
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
            items={Object.fromEntries(yearSelectOptions.map((year) => [String(year), String(year)]))}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearSelectOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon-sm" onClick={() => moveMonth(1)} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("assignments")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "assignments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Assignments
        </button>
        <button
          onClick={() => setActiveTab("swaps")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "swaps"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Swap Requests
        </button>
      </div>

      {activeTab === "assignments" && (
        isLoading ? (
          <SchedulesSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            {error}
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
            No events scheduled yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2.5 text-center w-10">No</th>
                  <th className="px-3 py-2.5 w-36">Tanggal</th>
                  <th className="px-3 py-2.5 w-40">Event</th>
                  <th className="px-3 py-2.5">Members</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map((event, rowIdx) => {
                  const date = new Date(event.date);
                  const sorted = sortMembers(event.members);
                  const past = isPast(date);

                  return (
                    <tr key={event.id} className="border-b last:border-b-0">
                      <td className="px-3 py-3 text-center text-muted-foreground align-top">
                        {rowIdx + 1}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap align-top">
                        <span className={cn("text-sm font-medium", past && "text-muted-foreground")}>
                          {format(date, "EEE, dd MMM yyyy", { locale: id })}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className={cn("text-sm font-medium", past && "text-muted-foreground")}>
                          {event.eventTypeName}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.regionName}</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        {sorted.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-1">
                            No members assigned yet.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {sorted.map((member) => (
                              <div
                                key={member.userId}
                                onClick={() => {
                                  if (canSwap && !member.hasPendingSwap) {
                                    openSwapDialog(event.id, member);
                                  }
                                }}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 transition-colors",
                                  canSwap && !member.hasPendingSwap
                                    ? "cursor-pointer hover:bg-muted hover:shadow-sm"
                                    : "cursor-default",
                                  member.hasPendingSwap && "opacity-40",
                                )}
                              >
                                <div className="flex min-w-0 items-center gap-1.5">
                                  {member.isSpv && (
                                    <Crown className="size-3 shrink-0 text-primary" />
                                  )}
                                  <span className={cn(
                                    "text-xs font-medium",
                                    member.isSpv ? "text-primary" : "text-foreground",
                                  )}>
                                    {member.fullName}
                                  </span>
                                </div>
                                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  Team {member.teamNumber}
                                </span>
                                {member.isPic && (
                                  <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                                    PIC
                                  </span>
                                )}
                                {member.hasPendingSwap && (
                                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    SWAPPED
                                  </span>
                                )}
                                {canSwap && !member.hasPendingSwap && (
                                  <ArrowLeftRight className="size-3 shrink-0 text-muted-foreground" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === "swaps" && (
        <SwapsTab
          swaps={swapRequests}
          loading={swapRequestsLoading}
          canApprove={canApprove}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Swap</DialogTitle>
            <DialogDescription>
              Select a replacement for{" "}
              <span className="font-medium text-foreground">
                {swappingMember?.member.fullName}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Replacement member</label>
              {replacementsLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader className="size-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading members...</span>
                </div>
              ) : replacements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No available members to swap with.
                </p>
              ) : (
                <Select
                  value={selectedReplacement}
                  onValueChange={(value) => setSelectedReplacement(value ?? "")}
                  items={Object.fromEntries(
                    replacements.map((u) => [String(u.id), `${u.fullName} (${u.nij})`]),
                  )}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {replacements.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.fullName} ({user.nij})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {swapError && (
              <p className="text-sm text-destructive">{swapError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapDialogOpen(false)} disabled={swapPending}>
              Cancel
            </Button>
            <Button onClick={handleSwap} disabled={swapPending || !selectedReplacement}>
              {swapPending ? "Requesting..." : "Request Swap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SwapsTab({
  swaps,
  loading,
  canApprove,
  onApprove,
  onReject,
}: {
  swaps: SwapRequestItem[];
  loading: boolean;
  canApprove: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg bg-card" />
        ))}
      </div>
    );
  }

  if (swaps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        No swap requests for this period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <th className="px-3 py-2.5">Event</th>
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5">From</th>
            <th className="px-3 py-2.5">From Team</th>
            <th className="px-3 py-2.5">To</th>
            <th className="px-3 py-2.5">To Team</th>
            <th className="px-3 py-2.5">Status</th>
            {canApprove && <th className="px-3 py-2.5 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {swaps.map((swap) => (
            <tr key={swap.id} className="border-b last:border-b-0">
              <td className="px-3 py-2.5 font-medium">{swap.eventName}</td>
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                {format(new Date(swap.eventDate), "d MMM yyyy", { locale: id })}
              </td>
              <td className="px-3 py-2.5">{swap.userFromName}</td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {swap.fromTeamNumber ? `Team ${swap.fromTeamNumber}` : "-"}
              </td>
              <td className="px-3 py-2.5">{swap.userToName ?? "-"}</td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {swap.toTeamNumber ? `Team ${swap.toTeamNumber}` : "-"}
              </td>
              <td className="px-3 py-2.5">
                <Badge className={cn(
                  "h-5 rounded px-2 text-[10px] font-semibold",
                  swap.status === "pending" && "bg-amber-500/15 text-amber-600 hover:bg-amber-500/15",
                  swap.status === "approved" && "bg-green-500/15 text-green-600 hover:bg-green-500/15",
                  swap.status === "rejected" && "bg-destructive/15 text-destructive hover:bg-destructive/15",
                )}>
                  {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                </Badge>
              </td>
              {canApprove && (
                <td className="px-3 py-2.5 text-center">
                  {swap.status === "pending" ? (
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-green-600 hover:text-green-700"
                        disabled={approvingId === swap.id || rejectingId === swap.id}
                        onClick={async () => {
                          setApprovingId(swap.id);
                          await onApprove(swap.id);
                          setApprovingId(null);
                        }}
                        aria-label="Approve"
                      >
                        {approvingId === swap.id ? (
                          <Loader className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive hover:text-destructive"
                        disabled={approvingId === swap.id || rejectingId === swap.id}
                        onClick={async () => {
                          setRejectingId(swap.id);
                          await onReject(swap.id);
                          setRejectingId(null);
                        }}
                        aria-label="Reject"
                      >
                        {rejectingId === swap.id ? (
                          <Loader className="size-3.5 animate-spin" />
                        ) : (
                          <X className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchedulesSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg bg-card" />
      ))}
    </div>
  );
}
