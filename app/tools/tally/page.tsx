// app/tools/tally/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  subscribeToTallySession,
  fetchTallySession,
  pushTallyDelta,
  type TallyLogEntry,
} from "@/lib/queries/tally-session";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMBO_TIMEOUT_MS = 750;
const MAX_LOG_ENTRIES = 200;
const RECENT_WRITE_GRACE_MS = 2500;

// ── Vibration patterns ────────────────────────────────────────────────────────
// iOS Safari does NOT support navigator.vibrate — only works on Android Chrome.
// Patterns: [waitMs, vibrateMs, waitMs, vibrateMs, ...]
const VIBRATE_PLUS  = [0, 80];           // single strong buzz
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function TallyPage() {
  // Synced from Firestore
  const [serviceType, setServiceType]     = useState("");
  const [serviceDate, setServiceDate]     = useState("");
  const [altarCallCount, setAltarCallCount] = useState(1);
  const [hasSession, setHasSession]       = useState(false);

  // Local UI state
  const [selectedIdx, setSelectedIdx]     = useState(0);
  const [counts, setCounts]               = useState<Record<string, number>>({});
  const [logs, setLogs]                   = useState<TallyLogEntry[]>([]);
  const [pendingLogs, setPendingLogs]     = useState<TallyLogEntry[]>([]);

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

  const altarCalls   = useMemo(() => buildAltarCallLabels(altarCallCount), [altarCallCount]);
  const currentLabel = altarCalls[selectedIdx] ?? "Altar Call 1";
  const currentCount = counts[currentLabel] ?? 0;

  // ── Real-time Firestore subscription ───────────────────────────────────────

  useEffect(() => {
    const unsubscribe = subscribeToTallySession(
      (data) => {
        setConnected(true);
        if (!data) { setHasSession(false); return; }

        setHasSession(true);
        setServiceType(data.serviceType ?? "");
        setServiceDate(data.date ?? "");
        setAltarCallCount(Math.max(data.altarCallCount ?? 1, 1));

        const serverCounts = data.counts ?? {};
        const now = Date.now();
        setCounts((prev) => {
          const merged: Record<string, number> = { ...serverCounts };
          for (const label of Object.keys(recentWritesRef.current)) {
            if (now - recentWritesRef.current[label] < RECENT_WRITE_GRACE_MS) {
              merged[label] = prev[label] ?? merged[label] ?? 0;
            }
          }
          return merged;
        });

        const serverLogs = (data.logs ?? []).slice(-MAX_LOG_ENTRIES).reverse();
        const confirmedIds = new Set(serverLogs.map((l) => l.id));
        setPendingLogs((prev) => prev.filter((l) => !confirmedIds.has(l.id)));
        setLogs(serverLogs);
      },
      (err) => {
        console.error("Tally session subscription error:", err);
        setConnected(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSelectedIdx((i) => Math.min(i, Math.max(altarCalls.length - 1, 0)));
  }, [altarCalls.length]);

  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      if (minusComboTimerRef.current) clearTimeout(minusComboTimerRef.current);
    };
  }, []);

  // ── Commit a delta to Firestore (with optimistic local log) ───────────────

  const commitDelta = useCallback((label: string, delta: number, isCombo: boolean) => {
    recentWritesRef.current[label] = Date.now();
    const optimisticEntry: TallyLogEntry = {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      delta,
      isCombo,
      altarCall: label,
      timestampMs: Date.now(),
    };
    setPendingLogs((prev) => [optimisticEntry, ...prev].slice(0, MAX_LOG_ENTRIES));
    pushTallyDelta(label, delta, isCombo).catch((err) => {
      console.error("Failed to push tally delta:", err);
      setConnected(false);
    });
  }, []);

  // ── Flush helpers ──────────────────────────────────────────────────────────

  const commitCombo = useCallback(
    (label: string, count: number) => {
      if (count <= 0) return;
      commitDelta(label, count, count > 1);
      setComboVisible(false);
      setCombo(0);
      comboRef.current = 0;
    },
    [commitDelta]
  );

  const commitMinusCombo = useCallback(
    (label: string, count: number) => {
      if (count <= 0) return;
      commitDelta(label, -count, count > 1);
      setMinusComboVisible(false);
      setMinusCombo(0);
      minusComboRef.current = 0;
    },
    [commitDelta]
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
    vibrate(VIBRATE_PLUS);

    setPlusFlash(true);
    setTimeout(() => setPlusFlash(false), 110);

    // Flush any pending minus combo first
    flushMinus();

    const label = currentLabel;
    setCounts((p) => ({ ...p, [label]: (p[label] ?? 0) + 1 }));
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
  }, [currentLabel, flushMinus, commitCombo]);

  // ── − handler ─────────────────────────────────────────────────────────────

  const handleMinus = useCallback(() => {
    const label = currentLabel;
    if ((counts[label] ?? 0) <= 0) return;

    vibrate(VIBRATE_MINUS);

    setMinusFlash(true);
    setTimeout(() => setMinusFlash(false), 110);

    // Flush any pending plus combo first
    flushPlus();

    setCounts((p) => ({ ...p, [label]: Math.max(0, (p[label] ?? 0) - 1) }));
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
  }, [currentLabel, counts, flushPlus, commitMinusCombo]);

  // ── Dropdown select ────────────────────────────────────────────────────────

  const handleSelect = (idx: number) => {
    flushPlus();
    flushMinus();
    setSelectedIdx(idx);
    setDropdownOpen(false);
  };

  // ── Manual refresh ─────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchTallySession();
      setConnected(true);
      if (data) {
        setHasSession(true);
        setServiceType(data.serviceType ?? "");
        setServiceDate(data.date ?? "");
        setAltarCallCount(Math.max(data.altarCallCount ?? 1, 1));
      }
    } catch (err) {
      console.error("Manual refresh failed:", err);
      setConnected(false);
    } finally {
      setTimeout(() => setRefreshing(false), 450);
    }
  };

  // ── Derived: unified log (optimistic pending + confirmed, newest first) ────

  const displayLogs = useMemo(() => {
    const confirmedIds = new Set(logs.map((l) => l.id));
    const stillPending = pendingLogs.filter((l) => !confirmedIds.has(l.id));
    return [...stillPending, ...logs].slice(0, MAX_LOG_ENTRIES);
  }, [logs, pendingLogs]);

  const fmtTime = (ms: number) =>
    new Date(ms).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const subtitle = serviceType
    ? `${serviceType}${serviceDate ? ` · ${serviceDate}` : ""}`
    : hasSession
    ? "Menunggu jenis layanan…"
    : "Belum ada data dari Reports";

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

          {/* ── Dropdown + refresh ── */}
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
                          {counts[ac] ?? 0}
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

          {/* ── Connection status ── */}
          <div className="flex items-center justify-center gap-1.5 pb-1 pt-1.5 shrink-0">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                connected ? "bg-green-500 animate-pulse" : "bg-red-500"
              )}
            />
            <span className="max-w-[260px] truncate text-[11px] text-muted-foreground">
              {subtitle}
            </span>
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
                    className="combo-pop flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 text-white shadow-md shadow-orange-500/30"
                  >
                    <span className="text-base font-black leading-none">+{combo}</span>
                    <span className="text-[10px] font-semibold tracking-widest text-orange-100 uppercase">
                      COMBO
                    </span>
                  </div>
                )}
                {minusComboVisible && minusCombo >= 2 && !comboVisible && (
                  <div
                    key={`m-${minusComboAnimKey}`}
                    className="combo-pop flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-white shadow-md shadow-red-600/30"
                  >
                    <span className="text-base font-black leading-none">−{minusCombo}</span>
                    <span className="text-[10px] font-semibold tracking-widest text-red-200 uppercase">
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

          <button
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-colors duration-75",
              plusFlash ? "bg-green-500" : "bg-green-600"
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
              +
            </span>
          </button>

          <button
            className={cn(
              "absolute bottom-5 left-5 z-10 flex items-center justify-center rounded-full font-bold text-white shadow-2xl transition-colors duration-75 border-2 border-white/10",
              minusFlash ? "bg-red-500" : "bg-red-700"
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
              −
            </span>
          </button>
        </div>

      </div>
    </>
  );
}