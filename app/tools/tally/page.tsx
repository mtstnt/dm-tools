// app/tools/tally/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  subscribeToTallySession,
  fetchTallySession,
  pushTallyDelta,
  listTallySessions,
  TC_IN_LABEL,
  TC_OUT_LABEL,
  TC_LABELS,
  tcTotals,
  type TallyLogEntry,
  type TallySessionSummary,
  type TallySessionKind,
} from "@/lib/queries/tally-session";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMBO_TIMEOUT_MS = 750;
const MAX_LOG_ENTRIES = 200;
// How long to trust a just-written local value over an incoming Firestore
// snapshot for the SAME altar call, so an in-flight combo never visually
// "rewinds" while the write round-trips to the server.
const RECENT_WRITE_GRACE_MS = 2500;

// ── Vibration patterns ────────────────────────────────────────────────────────
// iOS Safari does NOT support navigator.vibrate — only works on Android Chrome.
// Patterns: [waitMs, vibrateMs, waitMs, vibrateMs, ...]
const VIBRATE_PLUS  = [0, 80];          // single strong buzz
const VIBRATE_MINUS = [0, 30, 50, 30];  // double short buzz — clearly different from +

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch (_) { /* ignore */ }
  }
}

function buildAltarCallLabels(count: number): string[] {
  const n = Math.max(count, 1);
  return Array.from({ length: n }, (_, i) => `Altar Call ${i + 1}`);
}

// ── Per-counter log persistence (localStorage) ────────────────────────────────
// Each (session, label) pair — e.g. (session-abc, "TC Out") — gets its OWN
// log array in localStorage, so switching the selected counter never mixes
// one counter's history into another's, and the history survives refreshes
// even though the counters themselves are local-only (never in Firestore).
const LOG_STORAGE_PREFIX = "tally:log";

function logStorageKey(sessionId: string, label: string) {
  return `${LOG_STORAGE_PREFIX}:${sessionId}:${label}`;
}

function readStoredLog(sessionId: string, label: string): TallyLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(logStorageKey(sessionId, label));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read local tally log:", err);
    return [];
  }
}

function writeStoredLog(sessionId: string, label: string, entries: TallyLogEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      logStorageKey(sessionId, label),
      JSON.stringify(entries.slice(0, MAX_LOG_ENTRIES))
    );
  } catch (err) {
    console.error("Failed to save local tally log:", err);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TallyPage() {
  return (
    <Suspense fallback={null}>
      <TallyPageInner />
    </Suspense>
  );
}

function TallyPageInner() {
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get("session");

  // ── Which session (service type + date) is this page connected to? ───────
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionFromUrl);
  const [sessionList, setSessionList] = useState<TallySessionSummary[]>([]);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  // Mirrors selectedSessionId for reads inside async callbacks (e.g. a
  // pushTallyDelta().then() that resolves after the user has already
  // switched sessions) — a plain closure over the state would still see the
  // OLD value, but this ref always reflects the current one.
  const selectedSessionIdRef = useRef(selectedSessionId);
  useEffect(() => { selectedSessionIdRef.current = selectedSessionId; }, [selectedSessionId]);

  // Synced from Firestore (the selected session's document)
  const [serviceType, setServiceType]     = useState("");
  const [serviceDate, setServiceDate]     = useState("");
  const [altarCallCount, setAltarCallCount] = useState(1);
  const [kind, setKind]                   = useState<TallySessionKind>("altarcall");
  const [hasSession, setHasSession]       = useState(false);

  // Local UI state
  const [selectedIdx, setSelectedIdx]     = useState(0);
  const [counts, setCounts]               = useState<Record<string, number>>({});
  // Logs are local-only (never written to or read from Firestore) and kept
  // PER LABEL, so "TC In" and "TC Out" (or each altar call) each have their
  // own independent history instead of one combined list.
  const [logsByLabel, setLogsByLabel]             = useState<Record<string, TallyLogEntry[]>>({});
  const [pendingLogsByLabel, setPendingLogsByLabel] = useState<Record<string, TallyLogEntry[]>>({});

  // ── Plus combo
  const [combo, setCombo]                         = useState(0);
  const [comboVisible, setComboVisible]           = useState(false);
  const [comboAnimKey, setComboAnimKey]           = useState(0);
  const comboTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboRef         = useRef(0);
  const pendingLabelRef  = useRef("");

  // ── Minus combo  (parallel system)
  const [minusCombo, setMinusCombo]               = useState(0);
  const [minusComboVisible, setMinusComboVisible] = useState(false);
  const [minusComboAnimKey, setMinusComboAnimKey] = useState(0);
  const minusComboTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minusComboRef        = useRef(0);
  const minusPendingLabelRef = useRef("");

  // Misc
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [plusFlash, setPlusFlash]         = useState(false);
  const [minusFlash, setMinusFlash]       = useState(false);
  const [connected, setConnected]         = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const recentWritesRef = useRef<Record<string, number>>({});

  const altarCalls   = useMemo(
    () => (kind === "tc" ? [...TC_LABELS] : buildAltarCallLabels(altarCallCount)),
    [kind, altarCallCount]
  );
  const currentLabel = altarCalls[selectedIdx] ?? altarCalls[0];
  const isOutLabel    = kind === "tc" && currentLabel === TC_OUT_LABEL;
  const rawCount      = counts[currentLabel] ?? 0;
  // OUT is stored negative (0, -1, -2, …) and shown exactly as stored so the
  // number visibly counts DOWN. `displayValueFor` below is the hard
  // guarantee that it can never render as a positive number — this line is
  // just the value for the currently-selected label.
  const currentCount  = isOutLabel ? Math.min(0, rawCount) : rawCount;

  // Ceiling-guard: for TC Out, 0 is the highest possible value, always.
  // Any label's displayed value goes through this, so no matter where a
  // number came from (a local tap, a Firestore snapshot, a stale merge),
  // it is clamped before it ever reaches the screen.
  const displayValueFor = useCallback(
    (label: string) => {
      const raw = counts[label] ?? 0;
      return kind === "tc" && label === TC_OUT_LABEL ? Math.min(0, raw) : raw;
    },
    [counts, kind]
  );

  // ── Load the list of available sessions, for the picker ───────────────────

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const list = await listTallySessions();
      setSessionList(list);
      // Auto-pick the most recently updated session — but only the FIRST
      // time, never overriding a choice the user already made.
      setSelectedSessionId((prev) => prev ?? list[0]?.id ?? null);
    } catch (err) {
      console.error("Failed to list tally sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Real-time Firestore subscription to the SELECTED session ──────────────

  useEffect(() => {
    if (!selectedSessionId) {
      setHasSession(false);
      return;
    }

    // Clear the previous session's data immediately so there's no flash of
    // stale counts from the old session while the new one loads. The
    // per-label log maps reset to {} too — each label lazy-loads its own
    // history back in from localStorage (see the effect below) as soon as
    // it's viewed, so nothing is lost, it's just not fetched yet.
    setCounts({});
    setLogsByLabel({});
    setPendingLogsByLabel({});
    setCombo(0);
    setComboVisible(false);
    setMinusCombo(0);
    setMinusComboVisible(false);

    const unsubscribe = subscribeToTallySession(
      selectedSessionId,
      (data) => {
        setConnected(true);
        if (!data) { setHasSession(false); return; }

        setHasSession(true);
        setServiceType(data.serviceType ?? "");
        setServiceDate(data.date ?? "");
        setAltarCallCount(Math.max(data.altarCallCount ?? 1, 1));
        setKind(data.kind ?? "altarcall");

        const serverCounts = data.counts ?? {};
        const now = Date.now();
        setCounts((prev) => {
          const merged: Record<string, number> = { ...serverCounts };
          // Ceiling-guard at the data source: whatever Firestore says, TC
          // Out never surfaces above 0.
          if (data.kind === "tc" && merged[TC_OUT_LABEL] !== undefined) {
            merged[TC_OUT_LABEL] = Math.min(0, merged[TC_OUT_LABEL]);
          }
          for (const label of Object.keys(recentWritesRef.current)) {
            if (now - recentWritesRef.current[label] < RECENT_WRITE_GRACE_MS) {
              merged[label] = prev[label] ?? merged[label] ?? 0;
            }
          }
          return merged;
        });

        // logs are local-only — intentionally not read from Firestore
      },
      (err) => {
        console.error("Tally session subscription error:", err);
        setConnected(false);
      }
    );
    return () => unsubscribe();
  }, [selectedSessionId]);

  useEffect(() => {
    setSelectedIdx((i) => Math.min(i, Math.max(altarCalls.length - 1, 0)));
  }, [altarCalls.length]);

  // ── Lazy-load a counter's own log the first time it's viewed ──────────────
  // Runs whenever the selected session OR the selected counter (currentLabel)
  // changes. If that label's log for THIS session hasn't been pulled into
  // memory yet, read it from localStorage. Already-loaded labels (even ones
  // whose stored log is an empty array) are left alone — this is what makes
  // switching counters show that counter's own history instead of a mix.
  useEffect(() => {
    if (!selectedSessionId || !currentLabel) return;
    const sessionId = selectedSessionId;
    const label = currentLabel;
    setLogsByLabel((prev) => {
      if (prev[label]) return prev;
      return { ...prev, [label]: readStoredLog(sessionId, label) };
    });
  }, [selectedSessionId, currentLabel]);

  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      if (minusComboTimerRef.current) clearTimeout(minusComboTimerRef.current);
    };
  }, []);

  // ── Commit a delta to Firestore (log stored locally only, per-label) ──────

  const commitDelta = useCallback((label: string, delta: number, isCombo: boolean) => {
    if (!selectedSessionId) return;
    const sessionId = selectedSessionId; // snapshot: stays correct even if the user switches sessions before this resolves
    recentWritesRef.current[label] = Date.now();
    const optimisticEntry: TallyLogEntry = {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      delta,
      isCombo,
      altarCall: label,
      timestampMs: Date.now(),
    };
    setPendingLogsByLabel((prev) => ({
      ...prev,
      [label]: [optimisticEntry, ...(prev[label] ?? [])].slice(0, MAX_LOG_ENTRIES),
    }));
    pushTallyDelta(sessionId, label, delta, isCombo)
      .then((confirmedEntry) => {
        // Persist to THIS label's own localStorage bucket — never touches
        // Firestore, and never mixes with any other counter's log. We read
        // straight from storage rather than from React state so this stays
        // correct even if logsByLabel was reset by a session switch since
        // this write started.
        const nextForLabel = [confirmedEntry, ...readStoredLog(sessionId, label)].slice(0, MAX_LOG_ENTRIES);
        writeStoredLog(sessionId, label, nextForLabel);

        // Only touch on-screen state if we're still looking at that same
        // session — otherwise this session's maps were already reset and
        // this update would incorrectly resurrect stale data into them.
        if (selectedSessionIdRef.current !== sessionId) return;
        setPendingLogsByLabel((prev) => ({
          ...prev,
          [label]: (prev[label] ?? []).filter((l) => l.id !== optimisticEntry.id),
        }));
        setLogsByLabel((prev) => ({ ...prev, [label]: nextForLabel }));
      })
      .catch((err) => {
        console.error("Failed to push tally delta:", err);
        setConnected(false);
      });
  }, [selectedSessionId]);

  // ── Flush helpers ──────────────────────────────────────────────────────────

  const commitCombo = useCallback(
    (label: string, count: number) => {
      if (count <= 0) return;
      const outSign = kind === "tc" && label === TC_OUT_LABEL ? -1 : 1;
      commitDelta(label, outSign * count, count > 1);
      setComboVisible(false);
      setCombo(0);
      comboRef.current = 0;
    },
    [commitDelta, kind]
  );

  const commitMinusCombo = useCallback(
    (label: string, count: number) => {
      if (count <= 0) return;
      const outSign = kind === "tc" && label === TC_OUT_LABEL ? -1 : 1;
      commitDelta(label, -outSign * count, count > 1);
      setMinusComboVisible(false);
      setMinusCombo(0);
      minusComboRef.current = 0;
    },
    [commitDelta, kind]
  );

  const flushPlus = useCallback(() => {
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    if (comboRef.current > 0) commitCombo(pendingLabelRef.current, comboRef.current);
  }, [commitCombo]);

  const flushMinus = useCallback(() => {
    if (minusComboTimerRef.current) clearTimeout(minusComboTimerRef.current);
    if (minusComboRef.current > 0) commitMinusCombo(minusPendingLabelRef.current, minusComboRef.current);
  }, [commitMinusCombo]);

  // ── + handler ─────────────────────────────────────────────────────────────

  const handlePlus = useCallback(() => {
    if (!selectedSessionId) { setSessionPickerOpen(true); return; }
    vibrate(VIBRATE_PLUS);

    setPlusFlash(true);
    setTimeout(() => setPlusFlash(false), 110);

    // Flush any pending minus combo first
    flushMinus();

    const label = currentLabel;
    const outSign = kind === "tc" && label === TC_OUT_LABEL ? -1 : 1;
    setCounts((p) => {
      const next = (p[label] ?? 0) + outSign;
      // TC Out ceiling: never let this label sit above 0, even if the
      // starting value was somehow already positive.
      return { ...p, [label]: outSign === -1 ? Math.min(0, next) : next };
    });
    recentWritesRef.current[label] = Date.now();

    pendingLabelRef.current = label;
    comboRef.current += 1;
    setCombo(comboRef.current);
    setComboVisible(true);
    setComboAnimKey((k) => k + 1);

    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => {
      commitCombo(pendingLabelRef.current, comboRef.current);
    }, COMBO_TIMEOUT_MS);
  }, [selectedSessionId, currentLabel, kind, flushMinus, commitCombo]);

  // ── − handler ─────────────────────────────────────────────────────────────

  const handleMinus = useCallback(() => {
    if (!selectedSessionId) { setSessionPickerOpen(true); return; }
    const label = currentLabel;
    const outSign = kind === "tc" && label === TC_OUT_LABEL ? -1 : 1;
    const displayed = outSign === -1 ? Math.max(0, -(counts[label] ?? 0)) : (counts[label] ?? 0);
    if (displayed <= 0) return;

    vibrate(VIBRATE_MINUS);

    setMinusFlash(true);
    setTimeout(() => setMinusFlash(false), 110);

    // Flush any pending plus combo first
    flushPlus();

    setCounts((p) => {
      const next = (p[label] ?? 0) - outSign;
      return { ...p, [label]: outSign === -1 ? Math.min(0, next) : Math.max(0, next) };
    });
    recentWritesRef.current[label] = Date.now();

    minusPendingLabelRef.current = label;
    minusComboRef.current += 1;
    setMinusCombo(minusComboRef.current);
    setMinusComboVisible(true);
    setMinusComboAnimKey((k) => k + 1);

    if (minusComboTimerRef.current) clearTimeout(minusComboTimerRef.current);
    minusComboTimerRef.current = setTimeout(() => {
      commitMinusCombo(minusPendingLabelRef.current, minusComboRef.current);
    }, COMBO_TIMEOUT_MS);
  }, [selectedSessionId, currentLabel, kind, counts, flushPlus, commitMinusCombo]);

  // ── Dropdown select (altar call) ───────────────────────────────────────────

  const handleSelect = (idx: number) => {
    flushPlus();
    flushMinus();
    setSelectedIdx(idx);
    setDropdownOpen(false);
  };

  // ── Session select (picker) ────────────────────────────────────────────────

  const handleSelectSession = (id: string) => {
    flushPlus();
    flushMinus();
    setSelectedSessionId(id);
    setSelectedIdx(0);
    setSessionPickerOpen(false);
  };

  // ── Manual refresh ─────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSessions();
      if (selectedSessionId) {
        const data = await fetchTallySession(selectedSessionId);
        setConnected(true);
        if (data) {
          setHasSession(true);
          setServiceType(data.serviceType ?? "");
          setServiceDate(data.date ?? "");
          setAltarCallCount(Math.max(data.altarCallCount ?? 1, 1));
          setKind(data.kind ?? "altarcall");
        }
      }
    } catch (err) {
      console.error("Manual refresh failed:", err);
      setConnected(false);
    } finally {
      setTimeout(() => setRefreshing(false), 450);
    }
  };

  // ── Derived: THIS counter's own log (optimistic pending + confirmed) ──────
  // Scoped to currentLabel, so switching between TC In / TC Out / altar
  // calls always shows that counter's own history, never a blend of them.

  const displayLogs = useMemo(() => {
    const confirmed = logsByLabel[currentLabel] ?? [];
    const pending = pendingLogsByLabel[currentLabel] ?? [];
    const confirmedIds = new Set(confirmed.map((l) => l.id));
    const stillPending = pending.filter((l) => !confirmedIds.has(l.id));
    return [...stillPending, ...confirmed].slice(0, MAX_LOG_ENTRIES);
  }, [logsByLabel, pendingLogsByLabel, currentLabel]);

  const fmtTime = (ms: number) =>
    new Date(ms).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const subtitle = !selectedSessionId
    ? (sessionList.length > 0 ? "Tap untuk pilih sesi" : "Belum ada data dari Reports")
    : serviceType
    ? `${serviceType}${serviceDate ? ` · ${serviceDate}` : ""}`
    : hasSession
    ? "Menunggu jenis layanan…"
    : "Sesi tidak ditemukan";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes comboPop {
          0%   { transform: scale(0.35) translateY(5px); opacity: 0; }
          58%  { transform: scale(1.28) translateY(-2px); opacity: 1; }
          100% { transform: scale(1)   translateY(0);    opacity: 1; }
        }
        .combo-pop {
          animation: comboPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .tally-root * { -webkit-tap-highlight-color: transparent; }
        .log-scroll::-webkit-scrollbar { display: none; }
        .log-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div
        className="tally-root h-full flex flex-col overflow-hidden bg-background"
        style={{ userSelect: "none", WebkitUserSelect: "none" } as React.CSSProperties}
      >

        {/* ══════════════════════ TOP 35% ══════════════════════ */}
        <div className="flex flex-col border-b border-border" style={{ height: "35%" }}>

          {/* ── Altar call dropdown + refresh ── */}
          <div className="relative flex items-center justify-center px-4 pt-3 shrink-0">
            <div className="relative">
              <button
                className="flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-sm font-semibold"
                style={{ touchAction: "manipulation" }}
                onClick={() => setDropdownOpen((o) => !o)}
              >
                <span className="max-w-[180px] truncate">{currentLabel}</span>
                <ChevronDown
                  size={13}
                  className={cn("shrink-0 transition-transform duration-200", dropdownOpen && "rotate-180")}
                />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute left-1/2 top-full z-50 mt-2 min-w-[230px] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                    {altarCalls.map((ac, i) => (
                      <button
                        key={i}
                        className={cn(
                          "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-muted active:bg-muted/60",
                          i === selectedIdx && "font-bold text-primary"
                        )}
                        style={{ touchAction: "manipulation" }}
                        onClick={() => handleSelect(i)}
                      >
                        <span>{ac}{i === selectedIdx && " ✓"}</span>
                        <span className="ml-3 font-mono text-xs text-muted-foreground">
                          {displayValueFor(ac)}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              className="absolute right-4 top-3 rounded-full bg-muted p-2"
              style={{ touchAction: "manipulation" }}
              title="Refresh dari server"
              onClick={handleRefresh}
            >
              <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
            </button>
          </div>

          {/* ── Session picker trigger + connection status ── */}
          <div className="relative flex items-center justify-center pb-1 pt-1.5 shrink-0">
            <button
              className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
              style={{ touchAction: "manipulation" }}
              onClick={() => setSessionPickerOpen((o) => !o)}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  connected ? "bg-green-500 animate-pulse" : "bg-red-500"
                )}
              />
              <span className="max-w-[230px] truncate text-[11px] text-muted-foreground">
                {subtitle}
              </span>
              <ChevronDown
                size={11}
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform duration-200",
                  sessionPickerOpen && "rotate-180"
                )}
              />
            </button>

            {sessionPickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSessionPickerOpen(false)} />
                <div className="absolute left-1/2 top-full z-50 mt-1 w-[280px] max-w-[88vw] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                  <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      Pilih sesi
                    </span>
                    <button
                      className="rounded-full p-1 text-muted-foreground"
                      style={{ touchAction: "manipulation" }}
                      onClick={(e) => { e.stopPropagation(); loadSessions(); }}
                    >
                      <RefreshCw size={12} className={cn(loadingSessions && "animate-spin")} />
                    </button>
                  </div>
                  <div className="max-h-[40vh] overflow-y-auto">
                    {sessionList.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs italic text-muted-foreground">
                        {loadingSessions ? "Memuat…" : "Belum ada data dari Reports"}
                      </div>
                    ) : (
                      sessionList.map((s) => (
                        <button
                          key={s.id}
                          className={cn(
                            "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted active:bg-muted/60",
                            s.id === selectedSessionId && "bg-muted/60"
                          )}
                          style={{ touchAction: "manipulation" }}
                          onClick={() => handleSelectSession(s.id)}
                        >
                          <span className="truncate text-sm font-semibold">
                            {s.serviceType}
                            {s.id === selectedSessionId && " ✓"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {s.date} · {s.altarCallCount} altar call{s.altarCallCount > 1 ? "s" : ""}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Counter + combo badges + log ── */}
          <div className="flex flex-1 min-h-0">

            {/* Left: big number + combo badges */}
            <div className="flex flex-1 flex-col items-center justify-center pb-2 min-w-0">
              <div
                className="tabular-nums font-bold font-mono leading-none text-center"
                style={{ fontSize: "clamp(3.5rem, 19vw, 7rem)" }}
              >
                {currentCount.toLocaleString("id-ID")}
              </div>

              {/* Combo badge area — shows either + or − combo, whichever is active */}
              <div className="mt-1.5 flex h-8 items-center justify-center">
                {comboVisible && combo >= 2 && (
                  <div
                    key={comboAnimKey}
                    className={cn(
                      "combo-pop flex items-center gap-1.5 rounded-full px-3 py-1 text-white shadow-md",
                      isOutLabel ? "bg-red-600 shadow-red-600/30" : "bg-orange-500 shadow-orange-500/30"
                    )}
                  >
                    <span className="text-base font-black leading-none">
                      {isOutLabel ? "−" : "+"}{combo}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold tracking-widest uppercase",
                        isOutLabel ? "text-red-200" : "text-orange-100"
                      )}
                    >
                      COMBO
                    </span>
                  </div>
                )}
                {minusComboVisible && minusCombo >= 2 && !comboVisible && (
                  <div
                    key={`m-${minusComboAnimKey}`}
                    className={cn(
                      "combo-pop flex items-center gap-1.5 rounded-full px-3 py-1 text-white shadow-md",
                      isOutLabel ? "bg-orange-500 shadow-orange-500/30" : "bg-red-600 shadow-red-600/30"
                    )}
                  >
                    <span className="text-base font-black leading-none">
                      {isOutLabel ? "+" : "−"}{minusCombo}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold tracking-widest uppercase",
                        isOutLabel ? "text-orange-100" : "text-red-200"
                      )}
                    >
                      COMBO
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: unified log panel */}
            <div className="flex w-[118px] shrink-0 flex-col py-2 pr-3 border-l border-border/50 ml-1">
              <div className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground px-1">
                Log
              </div>
              <div className="log-scroll flex-1 overflow-y-auto space-y-[3px]">
                {displayLogs.length === 0 ? (
                  <div className="px-1 text-[10px] italic text-muted-foreground">
                    Belum ada aktivitas
                  </div>
                ) : (
                  displayLogs.map((log) => (
                    <div key={log.id} className="flex items-baseline gap-1 px-1 leading-snug">
                      <span
                        className={cn(
                          "min-w-[26px] font-mono text-[11px] font-bold shrink-0",
                          log.delta > 0 ? "text-green-500" : "text-red-500"
                        )}
                      >
                        {log.delta > 0 ? `+${log.delta}` : log.delta}
                        {log.isCombo && (
                          <span
                            className={cn(
                              "ml-[1px] text-[9px]",
                              log.delta > 0 ? "text-orange-400" : "text-red-400"
                            )}
                          >
                            ●
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] text-muted-foreground truncate">
                        {fmtTime(log.timestampMs)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════ BOTTOM 65% ══════════════════ */}
        <div className="relative" style={{ height: "65%" }}>

          {/* Big button — for TC Out this is the primary "tally out" action,
              so it's shown as a red minus even though it still calls
              handlePlus() under the hood (that's what pushes the count
              further negative). */}
          <button
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-colors duration-75",
              isOutLabel
                ? (plusFlash ? "bg-red-500" : "bg-red-700")
                : (plusFlash ? "bg-green-500" : "bg-green-600")
            )}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              e.preventDefault();
              handlePlus();
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span
              className="pointer-events-none select-none font-black leading-none text-white"
              style={{ fontSize: "clamp(5rem, 30vw, 10rem)" }}
            >
              {isOutLabel ? "−" : "+"}
            </span>
          </button>

          {/* Small button — for TC Out this is the "undo one out" action,
              shown as a green plus, but still calls handleMinus(). */}
          <button
            className={cn(
              "absolute bottom-5 left-5 z-10 flex items-center justify-center rounded-full font-bold text-white shadow-2xl transition-colors duration-75 border-2 border-white/10",
              isOutLabel
                ? (minusFlash ? "bg-green-500" : "bg-green-600")
                : (minusFlash ? "bg-red-500" : "bg-red-700")
            )}
            style={{
              width: "clamp(58px, 17vw, 76px)",
              height: "clamp(58px, 17vw, 76px)",
              touchAction: "none",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              handleMinus();
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span
              className="pointer-events-none select-none leading-none"
              style={{ fontSize: "clamp(1.8rem, 9vw, 2.5rem)" }}
            >
              {isOutLabel ? "+" : "−"}
            </span>
          </button>
        </div>

      </div>
    </>
  );
}