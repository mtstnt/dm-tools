"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import { fetchMembers, type Member } from "@/lib/queries/members";
import { rankByFuzzyName } from "../../../lib/fuzzy-search";
import {
  ensureDoaWilayahTallySession,
  subscribeToTallySession,
  tcTotals,
  type TallySessionDoc,
} from "@/lib/queries/tally-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CalendarDays,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface TCSnapshot {
  tcIn: number;
  tcOut: number;
  total: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Who has been assigned (PIC/TC1/TC2) in a given month. */
function assignedIds(month: DoaWilayahMonth): string[] {
  return [month.pic?.id, month.tc1?.id, month.tc2?.id].filter(Boolean) as string[];
}

/**
 * Count how many months (out of the year) each person has served in,
 * across PIC/TC1/TC2. Since a month can only ever have one Doa Wilayah,
 * this is naturally "how many times this year" — no extra weighting needed.
 */
function buildServiceCount(months: Record<string, DoaWilayahMonth>): Record<string, number> {
  const count: Record<string, number> = {};
  for (const m of Object.values(months)) {
    for (const id of assignedIds(m)) {
      count[id] = (count[id] ?? 0) + 1;
    }
  }
  return count;
}

function formatDateID(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ── MemberCombobox: searchable, fuzzy-matched person picker ───────────────────
// Same search-bar pattern as app/tools/assign/page.tsx (typo-tolerant name/
// nickname ranking), adapted into a single-select field for PIC/TC1/TC2.

function MemberCombobox({
  label,
  value,
  members,
  onChange,
  disabled,
}: {
  label: string;
  value?: MonthPerson | null;
  members: Member[];
  onChange: (p: MonthPerson | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // No query yet → browse everyone. Typing → fuzzy rank by name/nickname.
  const results = useMemo(() => {
    if (!query.trim()) return members;
    return rankByFuzzyName(query, members, 8);
  }, [query, members]);

  const selectMember = (m: Member | null) => {
    onChange(m ? { id: m.id, name: m.name } : null);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
        {label}
      </span>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 select-none text-xs text-muted-foreground">
          🔍
        </span>
        <Input
          value={open ? query : (value?.name ?? "")}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (!disabled) { setQuery(""); setOpen(true); } }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Escape") { setOpen(false); (e.target as HTMLInputElement).blur(); }
            if (e.key === "Enter" && results.length > 0) { e.preventDefault(); selectMember(results[0]); }
          }}
          placeholder={disabled ? "— belum ditentukan —" : "Cari nama…"}
          disabled={disabled}
          className="h-8 pl-7 text-sm"
        />

        {open && !disabled && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
            <div
              onClick={() => selectMember(null)}
              className="cursor-pointer border-b border-border/50 px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
            >
              — Kosongkan —
            </div>
            {results.length === 0 ? (
              <div className="px-3 py-3 text-center text-[11px] text-muted-foreground">
                Tidak ditemukan
              </div>
            ) : (
              results.map((m: Member) => (
                <div
                  key={m.id}
                  onClick={() => selectMember(m)}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-xs hover:bg-muted",
                    value?.id === m.id && "bg-muted font-medium"
                  )}
                >
                  {m.name}
                  {m.team && <span className="ml-1.5 text-[10px] text-muted-foreground">· {m.team}</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TC Tally live-read badge ───────────────────────────────────────────────────

function TCLiveBadge({ sessionId }: { sessionId: string }) {
  const [snap, setSnap] = useState<TCSnapshot | null>(null);

  useEffect(() => {
    const unsub = subscribeToTallySession(
      sessionId,
      (data: TallySessionDoc | null) => {
        setSnap(data ? tcTotals(data.counts) : { tcIn: 0, tcOut: 0, total: 0 });
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

// ── Single date + single TC section for a month ────────────────────────────────
// Only one Doa Wilayah per month → only one date, only one TC session. Once the
// TC session is opened, both the date field and the "Buka TC" button lock.

function DateAndTallySection({
  date,
  savedDate,
  tallySessionId,
  isDirty,
  canWrite,
  onDateChange,
  onOpenTally,
}: {
  date: string;
  savedDate?: string;
  tallySessionId?: string;
  isDirty: boolean;
  canWrite: boolean;
  onDateChange: (v: string) => void;
  onOpenTally: () => void;
}) {
  const opened = !!tallySessionId;
  const canOpenTally = canWrite && !opened && !!savedDate && !isDirty;

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
        <CalendarDays size={12} />
        Tanggal Doa Wilayah
      </span>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onDateChange(e.target.value)}
          disabled={!canWrite || opened}
          className="h-8 flex-1 text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant={opened ? "secondary" : "outline"}
          disabled={opened || !canOpenTally}
          onClick={onOpenTally}
          className="h-8 shrink-0 gap-1.5 text-xs"
        >
          {opened ? (
            <>
              <Lock size={11} />
              TC Terkunci
            </>
          ) : (
            <>
              <Hash size={11} />
              Buka TC
            </>
          )}
        </Button>
      </div>

      {date && (
        <span className="pl-0.5 text-[10px] text-muted-foreground">{formatDateID(date)}</span>
      )}

      {opened && tallySessionId && <TCLiveBadge sessionId={tallySessionId} />}

      {!opened && canWrite && date && isDirty && (
        <span className="pl-0.5 text-[10px] italic text-amber-500/80">
          Simpan perubahan dulu supaya tombol Buka TC aktif.
        </span>
      )}

      {opened && (
        <span className="pl-0.5 text-[10px] italic text-muted-foreground/70">
          Tanggal terkunci — TC untuk bulan ini sudah dibuka dan tidak bisa dibuat ulang.
        </span>
      )}
    </div>
  );
}

// ── Month Row ─────────────────────────────────────────────────────────────────

function MonthRow({
  monthIndex,
  year,
  data,
  members,
  canWrite,
  onOpenTally,
  onSaved,
}: {
  monthIndex: number;   // 1-12
  year: number;
  data: DoaWilayahMonth;
  members: Member[];
  canWrite: boolean;
  onOpenTally: (monthIndex: number, dateStr: string) => void;
  onSaved: (monthIndex: number, month: DoaWilayahMonth) => void;
}) {
  const [open,  setOpen]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft,  setDraft] = useState<DoaWilayahMonth>(data);

  // Sync when the saved record changes — e.g. right after Save, or after a
  // TC session gets linked to this month's date. This is what makes the
  // month row always show the latest persisted data when you open it, and
  // makes editing act like a PUT: the draft you edit always starts from
  // exactly what's stored, and Save fully replaces those fields.
  useEffect(() => { setDraft(data); }, [data]);

  const monthName = MONTH_NAMES[monthIndex - 1];
  const hasTally  = !!data.tallySessionId;

  const isDirty = useMemo(() => {
    return (
      (draft.pic?.id ?? null)  !== (data.pic?.id ?? null)  ||
      (draft.tc1?.id ?? null)  !== (data.tc1?.id ?? null)  ||
      (draft.tc2?.id ?? null)  !== (data.tc2?.id ?? null)  ||
      (draft.notes ?? "")      !== (data.notes ?? "")      ||
      (draft.date ?? "")       !== (data.date ?? "")
    );
  }, [draft, data]);

  const handleSave = async () => {
    if (!canWrite || saving) return;
    setSaving(true);
    try {
      // PUT semantics: every field here replaces whatever was saved before
      // for this month — reassigning PIC/TC1/TC2, editing notes, or
      // changing the date all just overwrite the previous value.
      await updateDoaWilayahMonth(year, monthIndex, {
        pic:   draft.pic   ?? null,
        tc1:   draft.tc1   ?? null,
        tc2:   draft.tc2   ?? null,
        notes: draft.notes ?? "",
        date:  draft.date  ?? "",
      });
      onSaved(monthIndex, {
        pic:   draft.pic   ?? null,
        tc1:   draft.tc1   ?? null,
        tc2:   draft.tc2   ?? null,
        notes: draft.notes ?? "",
        date:  draft.date  ?? "",
        tallySessionId: data.tallySessionId,
      });
    } finally {
      setSaving(false);
    }
  };

  const isAssigned = !!(data.pic || data.tc1 || data.tc2 || data.date);

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
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
          {monthIndex}
        </span>

        <span className="flex-1 text-sm font-semibold">{monthName}</span>

        {isAssigned ? (
          <CheckCircle2 size={15} className="shrink-0 text-green-500" />
        ) : (
          <Circle size={15} className="shrink-0 text-muted-foreground/30" />
        )}

        {hasTally && data.tallySessionId && <TCLiveBadge sessionId={data.tallySessionId} />}

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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MemberCombobox
              label="PIC"
              value={draft.pic}
              members={members}
              disabled={!canWrite}
              onChange={(p) => setDraft((d: DoaWilayahMonth) => ({ ...d, pic: p }))}
            />
            <MemberCombobox
              label="TC 1"
              value={draft.tc1}
              members={members}
              disabled={!canWrite}
              onChange={(p) => setDraft((d: DoaWilayahMonth) => ({ ...d, tc1: p }))}
            />
            <MemberCombobox
              label="TC 2"
              value={draft.tc2}
              members={members}
              disabled={!canWrite}
              onChange={(p) => setDraft((d: DoaWilayahMonth) => ({ ...d, tc2: p }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Catatan
            </span>
            <Textarea
              className="min-h-[72px] resize-none text-sm"
              placeholder="Catatan untuk bulan ini…"
              value={draft.notes ?? ""}
              disabled={!canWrite}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft((d: DoaWilayahMonth) => ({ ...d, notes: e.target.value }))}
            />
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
            <DateAndTallySection
              date={draft.date ?? ""}
              savedDate={data.date}
              tallySessionId={data.tallySessionId}
              isDirty={isDirty}
              canWrite={canWrite}
              onDateChange={(v) => setDraft((d: DoaWilayahMonth) => ({ ...d, date: v }))}
              onOpenTally={() => data.date && onOpenTally(monthIndex, data.date)}
            />
          </div>

          {canWrite && (
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
          )}
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

// ── TC Tally Summary (one session per month) ───────────────────────────────────

function TCMonthlySummary({
  year,
  months,
}: {
  year: number;
  months: Record<string, DoaWilayahMonth>;
}) {
  const [snapshots, setSnapshots] = useState<Record<number, TCSnapshot>>({});

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    for (let m = 1; m <= 12; m++) {
      const sid = months[monthKey(m)]?.tallySessionId;
      if (!sid) continue;
      const unsub = subscribeToTallySession(
        sid,
        (data: TallySessionDoc | null) => {
          const snap = data ? tcTotals(data.counts) : { tcIn: 0, tcOut: 0, total: 0 };
          setSnapshots((prev: Record<number, TCSnapshot>) => ({ ...prev, [m]: snap }));
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

  const totalValues = monthsWithTally.map((m) => snapshots[m]).filter(Boolean) as TCSnapshot[];
  const yearIn    = totalValues.reduce((s, v) => s + v.tcIn,  0);
  const yearOut   = totalValues.reduce((s, v) => s + v.tcOut, 0);
  const yearTotal = yearIn - yearOut;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Hash size={15} className="text-violet-400" />
        <h3 className="text-sm font-semibold">Tally Count Doa Wilayah</h3>
      </div>

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
  const [yearLoading, setYearLoading] = useState(true);

  const [members,        setMembers]        = useState<Member[]>([]);
  const [membersError,   setMembersError]   = useState(false);

  const [tallyDialog,    setTallyDialog]    = useState<{ monthIndex: number; dateStr: string; sessionId: string } | null>(null);
  const [tallyCreating, setTallyCreating]  = useState(false);

  // ── Load members (used for the PIC/TC1/TC2 picker). ──
  useEffect(() => {
    let mounted = true;
    fetchMembers()
      .then((rows) => { if (mounted) { setMembers(rows); setMembersError(false); } })
      .catch((e) => { console.error("Failed to load members:", e); if (mounted) setMembersError(true); });
    return () => { mounted = false; };
  }, []);

  // Anyone can read and write Doa Wilayah for now — no role/permission
  // checks. `canWrite` is kept as a constant (rather than inlining `true`
  // everywhere) so the write-gated UI below (disabled inputs, Save button,
  // etc.) has a single switch to flip if role-based access is reintroduced
  // later.
  const canWrite = true;

  useEffect(() => {
    setYearLoading(true);
    const unsub = subscribeDoaWilayahYear(
      year,
      (data) => { setYearDoc(data); setYearLoading(false); },
      (err)  => { console.error("Doa Wilayah subscription error:", err); setYearLoading(false); }
    );
    return () => unsub();
  }, [year]);

  // ── Tally open: ensure the TC session exists for THIS date, link it onto
  //    the month (server truth), then let the user jump in. Once
  //    `tallySessionId` is set, the date field and the "Buka TC" button lock
  //    permanently for that month (see DateAndTallySection).
  const handleOpenTally = useCallback(async (monthIndex: number, dateStr: string) => {
    if (!canWrite) return;
    const sessionId = buildDoaWilayahSessionId(dateStr);
    setTallyDialog({ monthIndex, dateStr, sessionId });
    setTallyCreating(true);
    try {
      await ensureDoaWilayahTallySession({
        sessionId,
        label: `Doa Wilayah — ${formatDateID(dateStr)}`,
        date:  dateStr,
      });
      await updateDoaWilayahMonth(year, monthIndex, { tallySessionId: sessionId });
    } finally {
      setTallyCreating(false);
    }
  }, [year, canWrite]);

  const months = yearDoc.months;
  const assignedMonthCount = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter((m) => {
      const d = months[monthKey(m)];
      return !!(d?.pic || d?.tc1 || d?.tc2 || d?.date);
    }).length;

  const yearOptions = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Doa Wilayah</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Jadwal PIC &amp; TC, tanggal pelaksanaan, dan tally count per bulan
          </p>
        </div>

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

      {/* ── Members failed to load — picker will be limited, but the rest of
            the page (saved schedule, tally counts) still works fine. ── */}
      {membersError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          Gagal memuat daftar member. Pilihan PIC/TC mungkin tidak lengkap — coba muat ulang halaman.
        </div>
      )}

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

        {yearLoading ? (
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
              canWrite={canWrite}
              onOpenTally={handleOpenTally}
              onSaved={(monthIndex, month) => {
                setYearDoc((prev) => ({
                  ...prev,
                  months: {
                    ...prev.months,
                    [monthKey(monthIndex)]: month,
                  },
                }));
              }}
            />
          ))
        )}
      </div>

      {/* ── Tally open dialog ── */}
      <Dialog open={!!tallyDialog} onOpenChange={(o: boolean) => !o && setTallyDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Tally Counter — {tallyDialog ? `${MONTH_NAMES[tallyDialog.monthIndex - 1]}, ${formatDateID(tallyDialog.dateStr)}` : ""}
            </DialogTitle>
          </DialogHeader>

          {tallyCreating ? (
            <div className="py-6 text-center text-sm text-muted-foreground animate-pulse">
              Menyiapkan sesi TC…
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {tallyDialog && <TCLiveBadge sessionId={tallyDialog.sessionId} />}

              <p className="text-sm text-muted-foreground">
                Buka halaman Tally untuk mulai menghitung. Sesi TC In/Out sudah disiapkan dan tersambung otomatis ke tanggal ini. Karena hanya ada satu Doa Wilayah per bulan, tombol &quot;Buka TC&quot; untuk bulan ini sekarang terkunci agar sesi tidak dibuat ulang.
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