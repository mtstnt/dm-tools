"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  MONTH_NAMES,
  subscribeDoaWilayahYear,
  updateDoaWilayahMonth,
  buildDoaWilayahSessionId,
  monthKey,
  type MonthPerson,
  type DoaWilayahMonth,
  type DoaWilayahYearDoc,
} from "@/lib/queries/doa-wilayah";
import {
  ensureDoaWilayahTallySession,
  subscribeToTallySession,
  tcTotals,
  type TallySessionDoc,
} from "@/lib/queries/tally-session";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users,
  Hash,
  StickyNote,
  TrendingUp,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  nickname?: string;
  team?: string;
}

interface TCSnapshot {
  tcIn: number;
  tcOut: number;
  total: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const NONE_VALUE   = "__none__";

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayName(p?: MonthPerson | null): string {
  if (!p) return "—";
  return p.name;
}

function memberLabel(m: Member): string {
  return m.nickname ? `${m.name} (${m.nickname})` : m.name;
}

/** Who has been assigned (PIC/TC1/TC2) in a given month. */
function assignedIds(month: DoaWilayahMonth): string[] {
  return [month.pic?.id, month.tc1?.id, month.tc2?.id].filter(Boolean) as string[];
}

/** Count total appearances across all months (for the Ringkasan section). */
function buildServiceCount(months: Record<string, DoaWilayahMonth>): Record<string, number> {
  const count: Record<string, number> = {};
  for (const m of Object.values(months)) {
    for (const id of assignedIds(m)) {
      count[id] = (count[id] ?? 0) + 1;
    }
  }
  return count;
}

// ── MemberSelect sub-component ────────────────────────────────────────────────

function MemberSelect({
  label,
  value,
  members,
  onChange,
}: {
  label: string;
  value?: MonthPerson | null;
  members: Member[];
  onChange: (p: MonthPerson | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
        {label}
      </span>
      <Select
        value={value?.id ?? NONE_VALUE}
        onValueChange={(v: string | null) => {
          if (!v || v === NONE_VALUE) { onChange(null); return; }
          const m = members.find((x) => x.id === v);
          if (m) onChange({ id: m.id, name: m.name });
        }}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>— Pilih —</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {memberLabel(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── TC Tally summary mini-widget (live read) ──────────────────────────────────

function TCLiveBadge({ sessionId }: { sessionId: string }) {
  const [snap, setSnap] = useState<TCSnapshot | null>(null);

  useEffect(() => {
    const unsub = subscribeToTallySession(
      sessionId,
      (data: TallySessionDoc | null) => {
        if (!data) { setSnap(null); return; }
        setSnap(tcTotals(data.counts));
      }
    );
    return () => unsub();
  }, [sessionId]);

  if (!snap) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] font-mono">
      <span className="text-green-500">▲ In {snap.tcIn}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className="text-red-400">▼ Out {snap.tcOut}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className="font-bold text-foreground">= {snap.total}</span>
    </div>
  );
}

// ── Month Row ─────────────────────────────────────────────────────────────────

function MonthRow({
  monthIndex,
  year,
  data,
  members,
  onOpenTally,
}: {
  monthIndex: number;   // 1-12
  year: number;
  data: DoaWilayahMonth;
  members: Member[];
  onOpenTally: (monthIndex: number) => void;
}) {
  const [open,  setOpen]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft,  setDraft] = useState<DoaWilayahMonth>(data);

  // Sync when external data changes
  useEffect(() => { setDraft(data); }, [data]);

  const monthName = MONTH_NAMES[monthIndex - 1];
  const sessionId = buildDoaWilayahSessionId(year, monthIndex);
  const hasTally  = !!data.tallySessionId;

  const isDirty = useMemo(() => {
    return (
      draft.pic?.id !== data.pic?.id ||
      draft.tc1?.id !== data.tc1?.id ||
      draft.tc2?.id !== data.tc2?.id ||
      (draft.notes ?? "") !== (data.notes ?? "")
    );
  }, [draft, data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoaWilayahMonth(year, monthIndex, {
        pic:   draft.pic   ?? null,
        tc1:   draft.tc1   ?? null,
        tc2:   draft.tc2   ?? null,
        notes: draft.notes ?? "",
      });
    } finally {
      setSaving(false);
    }
  };

  const isAssigned = !!(data.pic || data.tc1 || data.tc2);

  return (
    <div className={cn(
      "rounded-xl border border-border/60 bg-card transition-all",
      open && "border-border"
    )}>
      {/* ── Header row ── */}
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o: boolean) => !o)}
      >
        {/* Month number badge */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
          {monthIndex}
        </span>

        {/* Month name */}
        <span className="flex-1 text-sm font-semibold">{monthName}</span>

        {/* Assigned indicator */}
        {isAssigned ? (
          <CheckCircle2 size={15} className="shrink-0 text-green-500" />
        ) : (
          <Circle size={15} className="shrink-0 text-muted-foreground/30" />
        )}

        {/* TC live badge or link */}
        {hasTally && (
          <TCLiveBadge sessionId={sessionId} />
        )}

        {/* PIC pill */}
        {data.pic && (
          <span className="hidden sm:inline max-w-[120px] truncate rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {data.pic.name}
          </span>
        )}

        {open ? <ChevronUp size={15} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={15} className="shrink-0 text-muted-foreground" />}
      </button>

      {/* ── Expanded body ── */}
      {open && (
        <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-4">

          {/* Person picks */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MemberSelect
              label="PIC"
              value={draft.pic}
              members={members}
              onChange={(p) => setDraft((d: DoaWilayahMonth) => ({ ...d, pic: p }))}
            />
            <MemberSelect
              label="TC 1"
              value={draft.tc1}
              members={members}
              onChange={(p) => setDraft((d: DoaWilayahMonth) => ({ ...d, tc1: p }))}
            />
            <MemberSelect
              label="TC 2"
              value={draft.tc2}
              members={members}
              onChange={(p) => setDraft((d: DoaWilayahMonth) => ({ ...d, tc2: p }))}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Catatan
            </span>
            <Textarea
              className="min-h-[72px] resize-none text-sm"
              placeholder="Catatan untuk bulan ini…"
              value={draft.notes ?? ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft((d: DoaWilayahMonth) => ({ ...d, notes: e.target.value }))}
            />
          </div>

          {/* TC Tally section */}
          <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Hash size={13} className="text-violet-400" />
                Tally Counter (TC)
              </span>
              {hasTally && <TCLiveBadge sessionId={sessionId} />}
            </div>

            {hasTally ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => onOpenTally(monthIndex)}
                >
                  <ExternalLink size={11} />
                  Buka Tally
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  Sesi tersambung
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700"
                  onClick={() => onOpenTally(monthIndex)}
                >
                  <Hash size={11} />
                  Buat &amp; Buka Tally
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  Belum ada sesi TC
                </span>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center justify-end gap-2">
            {isDirty && (
              <span className="text-[11px] text-muted-foreground italic">Ada perubahan belum disimpan</span>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="h-8"
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary Section ───────────────────────────────────────────────────────────

function ServiceSummary({
  months,
  members,
}: {
  months: Record<string, DoaWilayahMonth>;
  members: Member[];
}) {
  const serviceCount = useMemo(() => buildServiceCount(months), [months]);
  const sorted = useMemo(() =>
    [...members]
      .filter((m: Member) => (serviceCount[m.id] ?? 0) > 0)
      .sort((a: Member, b: Member) => (serviceCount[b.id] ?? 0) - (serviceCount[a.id] ?? 0)),
    [members, serviceCount]
  );

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp size={15} className="text-primary" />
        <h3 className="text-sm font-semibold">Ringkasan Pelayanan</h3>
        <span className="text-[11px] text-muted-foreground">— frekuensi pelayanan tahun ini</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map((m: Member) => (
          <div
            key={m.id}
            className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-2.5 py-1"
          >
            <span className="text-xs font-medium">{m.name}</span>
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {serviceCount[m.id]}×
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TC Tally Summary (detailed per-month) ─────────────────────────────────────

function TCMonthlySummary({
  year,
  months,
}: {
  year: number;
  months: Record<string, DoaWilayahMonth>;
}) {
  const [snapshots, setSnapshots] = useState<Record<number, TCSnapshot>>({});

  // Subscribe to all months that have a tally session
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    for (let m = 1; m <= 12; m++) {
      const mData = months[monthKey(m)];
      if (!mData?.tallySessionId) continue;
      const sessionId = buildDoaWilayahSessionId(year, m);
      const monthNum  = m;
      const unsub = subscribeToTallySession(
        sessionId,
        (data: TallySessionDoc | null) => {
          const snap = data ? tcTotals(data.counts) : { tcIn: 0, tcOut: 0, total: 0 };
          setSnapshots((prev: Record<number, TCSnapshot>) => ({ ...prev, [monthNum]: snap }));
        }
      );
      unsubs.push(unsub);
    }
    return () => unsubs.forEach((u) => u());
  }, [year, months]);

  const monthsWithTally = Array.from({ length: 12 }, (_, i) => i + 1).filter(
    (m) => !!months[monthKey(m)]?.tallySessionId
  );

  if (monthsWithTally.length === 0) return null;

  const snapValues = Object.values(snapshots) as TCSnapshot[];
  const yearIn    = snapValues.reduce((s: number, v: TCSnapshot) => s + v.tcIn,  0);
  const yearOut   = snapValues.reduce((s: number, v: TCSnapshot) => s + v.tcOut, 0);
  const yearTotal = yearIn - yearOut;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Hash size={15} className="text-violet-400" />
        <h3 className="text-sm font-semibold">Tally Count Doa Wilayah</h3>
      </div>

      {/* Year totals */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: "TC In",  value: yearIn,    color: "text-green-500" },
          { label: "TC Out", value: yearOut,   color: "text-red-400" },
          { label: "Total",  value: yearTotal, color: "text-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-muted/50 p-2.5 text-center">
            <div className={cn("text-xl font-bold font-mono tabular-nums", color)}>
              {value}
            </div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Per-month breakdown */}
      <div className="space-y-1.5">
        {monthsWithTally.map((m) => {
          const snap = snapshots[m];
          return (
            <div key={m} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 font-medium text-muted-foreground">
                {MONTH_NAMES[m - 1]}
              </span>
              {snap ? (
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-green-500">▲ {snap.tcIn}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-red-400">▼ {snap.tcOut}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="font-bold">= {snap.total}</span>
                </div>
              ) : (
                <span className="text-muted-foreground/40 italic">belum ada data</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DoaWilayahPage() {
  const [year,    setYear]    = useState(CURRENT_YEAR);
  const [yearDoc, setYearDoc] = useState<DoaWilayahYearDoc>({ year, months: {} });
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Tally open dialog
  const [tallyDialog,    setTallyDialog]    = useState<{ monthIndex: number; sessionId: string } | null>(null);
  const [tallyCreating, setTallyCreating]  = useState(false);

  // ── Load members from Firebase ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "members"));
        const rows: Member[] = snap.docs.map((d: import("firebase/firestore").QueryDocumentSnapshot) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            name: (data.name as string) ?? "(tanpa nama)",
            nickname: (data.nickname as string) ?? undefined,
            team: (data.team as string) ?? undefined,
          };
        });
        rows.sort((a, b) => a.name.localeCompare(b.name, "id"));
        setMembers(rows);
      } catch (e) {
        console.error("Failed to load members:", e);
      }
    };
    void load();
  }, []);

  // ── Subscribe to year doc ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeDoaWilayahYear(
      year,
      (data) => { setYearDoc(data); setLoading(false); },
      (err)  => { console.error("Doa Wilayah subscription error:", err); setLoading(false); }
    );
    return () => unsub();
  }, [year]);

  // ── Tally open: ensure the TC session exists, then navigate ───────────────
  const handleOpenTally = useCallback(async (monthIndex: number) => {
    const sessionId = buildDoaWilayahSessionId(year, monthIndex);
    const monthName = MONTH_NAMES[monthIndex - 1];
    setTallyDialog({ monthIndex, sessionId });
    setTallyCreating(true);
    try {
      await ensureDoaWilayahTallySession({
        sessionId,
        label: `Doa Wilayah — ${monthName} ${year}`,
        date:  `${monthName} ${year}`,
      });
      // Mark session id on the month doc
      await updateDoaWilayahMonth(year, monthIndex, { tallySessionId: sessionId });
    } finally {
      setTallyCreating(false);
    }
  }, [year]);

  const months = yearDoc.months;
  const assignedMonthCount = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter((m) => {
      const d = months[monthKey(m)];
      return !!(d?.pic || d?.tc1 || d?.tc2);
    }).length;

  const yearOptions = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Doa Wilayah</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Jadwal PIC &amp; TC, catatan bulanan, dan tally count per event
          </p>
        </div>

        {/* Year picker */}
        <Select
          value={String(year)}
          onValueChange={(v: string | null) => setYear(Number(v ?? CURRENT_YEAR))}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Quick stats bar ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Users size={14} />, label: "Total Anggota", value: members.length },
          { icon: <CheckCircle2 size={14} className="text-green-500" />, label: "Bulan Terisi", value: assignedMonthCount },
          { icon: <Circle size={14} className="text-muted-foreground/40" />, label: "Belum Dijadwalkan", value: 12 - assignedMonthCount },
        ].map(({ icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              {icon}
              <span>{label}</span>
            </div>
            <div className="text-xl font-bold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Service summary ── */}
      <ServiceSummary months={months} members={members} />

      {/* ── TC Monthly summary ── */}
      <TCMonthlySummary year={year} months={months} />

      {/* ── Month list ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <StickyNote size={14} className="text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Jadwal Bulanan {year}
          </h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : (
          Array.from({ length: 12 }, (_: unknown, i: number) => i + 1).map((m: number) => (
            <MonthRow
              key={m}
              monthIndex={m}
              year={year as number}
              data={(months[monthKey(m)] ?? {}) as DoaWilayahMonth}
              members={members as Member[]}
              onOpenTally={handleOpenTally as (monthIndex: number) => void}
            />
          ))
        )}
      </div>

      {/* ── Tally open dialog ── */}
      <Dialog open={!!tallyDialog} onOpenChange={(o: boolean) => !o && setTallyDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Tally Counter — {tallyDialog ? MONTH_NAMES[tallyDialog.monthIndex - 1] : ""}
            </DialogTitle>
          </DialogHeader>

          {tallyCreating ? (
            <div className="py-6 text-center text-sm text-muted-foreground animate-pulse">
              Menyiapkan sesi TC…
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {/* TC Live preview */}
              {tallyDialog && <TCLiveBadge sessionId={tallyDialog.sessionId} />}

              <p className="text-sm text-muted-foreground">
                Buka halaman Tally untuk mulai menghitung. Sesi TC In/Out sudah disiapkan dan tersambung otomatis.
              </p>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    if (tallyDialog) {
                      window.open(`/tools/tally?session=${tallyDialog.sessionId}`, "_blank");
                    }
                    setTallyDialog(null);
                  }}
                >
                  <ExternalLink size={14} />
                  Buka Tally
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTallyDialog(null)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}