"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
import { getSchedules, getPendingSwaps, approveSwap, rejectSwap, requestSwap, getAvailableReplacements, type ScheduleEvent, type ScheduleMember, type SwapRequestItem, type ReplacementUser } from "@/actions/schedules";
import { getEventScheduleYears } from "@/actions/events";
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

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupMembersByTeam(members: ScheduleMember[], teamNumbers: number[]): Map<number, ScheduleMember[]> {
  const map = new Map<number, ScheduleMember[]>();
  for (const num of teamNumbers) {
    map.set(num, []);
  }
  for (const m of members) {
    if (m.teamNumber != null) {
      const list = map.get(m.teamNumber);
      if (list) {
        list.push(m);
      } else {
        map.set(m.teamNumber, [m]);
      }
    }
  }
  return map;
}

export default function SchedulesPage() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [yearOptions, setYearOptions] = useState<number[]>(() => [new Date().getFullYear()]);

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

  const [pendingSwaps, setPendingSwaps] = useState<SwapRequestItem[]>([]);
  const [pendingSwapsLoading, setPendingSwapsLoading] = useState(false);

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
    if (!canApprove) return;
    let mounted = true;
    async function loadPending() {
      setPendingSwapsLoading(true);
      const result = await getPendingSwaps();
      if (!mounted) return;
      if (result.success && result.data) {
        setPendingSwaps(result.data);
      }
      setPendingSwapsLoading(false);
    }
    loadPending();
    return () => { mounted = false; };
  }, [canApprove, events]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  const maxTeamSlots = useMemo(() => {
    let max = 0;
    for (const e of events) {
      if (e.teams.length > max) max = e.teams.length;
    }
    return Math.max(max, 1);
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
    if (canApprove) {
      const pendingResult = await getPendingSwaps();
      if (pendingResult.success && pendingResult.data) {
        setPendingSwaps(pendingResult.data);
      }
    }
  }

  async function handleApprove(requestId: number) {
    const result = await approveSwap(requestId);
    if (!result.success) return;
    const [schedulesResult, pendingResult] = await Promise.all([
      getSchedules(selectedMonth, selectedYear),
      getPendingSwaps(),
    ]);
    if (schedulesResult.success && schedulesResult.data) {
      setEvents(schedulesResult.data);
    }
    if (pendingResult.success && pendingResult.data) {
      setPendingSwaps(pendingResult.data);
    }
  }

  async function handleReject(requestId: number) {
    const result = await rejectSwap(requestId);
    if (!result.success) return;
    const pendingResult = await getPendingSwaps();
    if (pendingResult.success && pendingResult.data) {
      setPendingSwaps(pendingResult.data);
    }
  }

  const showPendingSection = canApprove && !pendingSwapsLoading && pendingSwaps.length > 0;

  const slotHeaders: { team: string; members: string }[] = [];
  for (let i = 0; i < maxTeamSlots; i++) {
    slotHeaders.push({
      team: `Tim Slot ${i + 1}`,
      members: `Anggota Slot ${i + 1}`,
    });
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

      {showPendingSection && (
        <PendingApprovals
          swaps={pendingSwaps}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {isLoading ? (
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
                <th className="px-3 py-2.5 text-center">No</th>
                <th className="px-3 py-2.5">Tanggal</th>
                {slotHeaders.map((h, i) => (
                  <th key={i} colSpan={2} className="px-3 py-2.5 text-center border-l">
                    Slot {i + 1}
                  </th>
                ))}
              </tr>
              <tr className="border-b bg-muted/30 text-left text-[11px] font-medium text-muted-foreground">
                <th />
                <th />
                {slotHeaders.map((h, i) => (
                  <Fragment key={i}>
                    <th className="px-3 py-2 border-l font-medium">{h.team}</th>
                    <th className="px-3 py-2 font-medium">{h.members}</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((event, rowIdx) => {
                const date = new Date(event.date);
                const teamNumbers = event.teams.map((t) => t.number);
                const membersByTeam = groupMembersByTeam(event.members, teamNumbers);
                const past = isPast(date);

                return (
                  <tr key={event.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2.5 text-center text-muted-foreground">
                      {rowIdx + 1}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={cn("text-sm font-medium", past && "text-muted-foreground")}>
                        {format(date, "EEE, dd MMM yyyy", { locale: id })}
                      </span>
                    </td>
                    {Array.from({ length: maxTeamSlots }).map((_, slotIdx) => {
                      const team = event.teams[slotIdx];
                      if (!team) {
                        return (
                          <Fragment key={slotIdx}>
                            <td className="px-3 py-2 border-l text-muted-foreground">-</td>
                            <td className="px-3 py-2 text-muted-foreground">-</td>
                          </Fragment>
                        );
                      }
                      const members = membersByTeam.get(team.number) ?? [];
                      return (
                        <Fragment key={slotIdx}>
                          <td className={cn("px-3 py-2 border-l align-top", past && "text-muted-foreground")}>
                            <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              Team {team.number}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top">
                            {members.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">-</span>
                            ) : (
                              <ul className="space-y-1">
                                {members.map((member) => (
                                  <li key={member.userId} className="group/item flex items-center gap-1.5">
                                    {member.isSpv && (
                                      <Crown className="size-3 shrink-0 text-primary" />
                                    )}
                                    <span className={cn(
                                      "text-xs",
                                      member.isSpv ? "font-semibold text-primary" : "text-foreground",
                                    )}>
                                      {member.fullName}
                                    </span>
                                    {member.isPic && (
                                      <span className="rounded bg-amber-500/15 px-1 py-px text-[9px] font-bold text-amber-600">
                                        PIC
                                      </span>
                                    )}
                                    {canSwap && (
                                      <button
                                        onClick={() => openSwapDialog(event.id, member)}
                                        className="ml-auto shrink-0 opacity-0 transition-opacity group-hover/item:opacity-100 text-muted-foreground hover:text-foreground"
                                        aria-label={`Swap ${member.fullName}`}
                                      >
                                        <ArrowLeftRight className="size-3" />
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

function PendingApprovals({
  swaps,
  onApprove,
  onReject,
}: {
  swaps: SwapRequestItem[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  return (
    <div className="mb-7 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">Pending Swap Approvals</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Event</th>
              <th className="pb-2 pr-3 font-medium">Date</th>
              <th className="pb-2 pr-3 font-medium">From</th>
              <th className="pb-2 pr-3 font-medium">From Team</th>
              <th className="pb-2 pr-3 font-medium">To</th>
              <th className="pb-2 pr-3 font-medium">To Team</th>
              <th className="pb-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {swaps.map((swap) => (
              <tr key={swap.id} className="border-b last:border-b-0">
                <td className="py-2 pr-3 font-medium">{swap.eventName}</td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {format(new Date(swap.eventDate), "d MMM yyyy", { locale: id })}
                </td>
                <td className="py-2 pr-3">{swap.userFromName}</td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {swap.fromTeamNumber ? `Team ${swap.fromTeamNumber}` : "-"}
                </td>
                <td className="py-2 pr-3">{swap.userToName ?? "-"}</td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {swap.toTeamNumber ? `Team ${swap.toTeamNumber}` : "-"}
                </td>
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
