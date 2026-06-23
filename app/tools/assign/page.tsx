// app/tools/assign/page.tsx
"use client";

import { useState, useMemo, useCallback } from "react";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */

interface Member {
  id: number;
  name: string;
  color: string;
  availability: "both" | "teen" | "youth";
}

interface EventSR {
  tcIn: string | null;
  tcOut: string | null;
  fd: string | null;
}

interface EventState {
  assignments: Record<string, string[]>;
  sr: EventSR;
}

interface SRPickerState {
  ei: number;
  role: string;
}

interface GeomBase {
  cx: number;
  cy: number;
  nc?: boolean;
}
interface GeomRect extends GeomBase {
  t: "r";
  x: number;
  y: number;
  w: number;
  h: number;
}
interface GeomPoly extends GeomBase {
  t: "p";
  pts: [number, number][];
}
type Geom = GeomRect | GeomPoly;

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */

const COLORS: string[] = [
  "#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#4D96FF",
  "#FF9A8B", "#C77DFF", "#FFB347", "#00D4AA", "#FF6FC8",
  "#52B788", "#FFCB69", "#F15BB5", "#00BBF9", "#8338EC",
  "#F4845F", "#A8DADC", "#FF595E", "#06D6A0", "#FEE440",
];

const WEIGHTS: Record<number, Record<string, number>> = {
  0: { A1: 0.4, A2: 0.5, A3: 0.4, A4: 0.2, B1: 0.08, B2: 0.1, B3: 0.05, S1: 0.02, S2: 0.02 },
  1: { A1: 0.7, A2: 0.6, A3: 0.8, A4: 0.5, B1: 0.1,  B2: 0.3, B3: 0.1,  S1: 0.02, S2: 0.02 },
};

const ADJ: Record<string, string[]> = {
  A1: ["S1", "B1"], A2: ["B1", "B2"], A3: ["B2", "B3"], A4: ["B3", "S2"],
};

const A_BL    = ["A1", "A2", "A3", "A4"];
const BS_BL   = ["B1", "B2", "B3", "S1", "S2"];
const ORDERED = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "S1", "S2"];
const SR_ROLES  = ["TC In + Altarcall S1", "TC Out + Altarcall S2", "FD"];
const EVT_NAMES = ["Teen", "Youth"];

const ARROW_ROT: Record<string, number> = {
  S1: 90, S2: -90, A1: 45, A2: 0, A3: -45, A4: -90, B1: 0, B2: 0, B3: 0,
};

const GEOM: Record<string, Geom> = {
  MAIN_STAGE: { t: "r", x: 215, y: 12,  w: 400, h: 84,  cx: 415, cy: 54,  nc: true },
  S1:  { t: "r", x: 8,   y: 12,  w: 180, h: 84,  cx: 98,  cy: 54  },
  S2:  { t: "r", x: 642, y: 12,  w: 180, h: 84,  cx: 732, cy: 54  },
  A1:  { t: "p", pts: [[10,125],[172,108],[184,252],[122,280],[8,262]],        cx: 99,  cy: 205 },
  A2:  { t: "r", x: 194, y: 108, w: 163, h: 183, cx: 275, cy: 199 },
  A3:  { t: "p", pts: [[382,108],[520,128],[518,268],[456,292],[370,254]],     cx: 449, cy: 210 },
  A4:  { t: "p", pts: [[540,115],[658,138],[653,290],[538,292]],               cx: 597, cy: 208 },
  B1:  { t: "r", x: 8,   y: 352, w: 168, h: 126, cx: 92,  cy: 415 },
  B2:  { t: "r", x: 194, y: 352, w: 168, h: 126, cx: 278, cy: 415 },
  B3:  { t: "r", x: 380, y: 352, w: 230, h: 126, cx: 495, cy: 415 },
};

/* ═══════════════════════════════════════════════════
   PURE HELPERS
═══════════════════════════════════════════════════ */

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const isConsec = (aBlocks: string[]): boolean => {
  if (aBlocks.length <= 1) return true;
  const idx = aBlocks.map((b) => A_BL.indexOf(b)).sort((a, b) => a - b);
  return idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
};

const autoAssignFn = (
  counters: Member[],
  weights: Record<string, number>,
  prev: Record<string, string | string[]> = {}
): Record<string, string[]> => {
  if (!counters.length) return {};
  const result: Record<string, string[]> = {};
  const loadOf: Record<string, number> = {};
  counters.forEach((c) => { loadOf[c.name] = 0; });

  const prevOf: Record<string, string[]> = {};
  Object.entries(prev).forEach(([block, names]) => {
    (Array.isArray(names) ? names : [names])
      .filter(Boolean)
      .forEach((nm) => { prevOf[nm] = [...(prevOf[nm] || []), block]; });
  });

  const myA  = (name: string) => A_BL.filter((b) => (result[b] || []).includes(name));
  const cntA = (name: string) => myA(name).length;
  const N    = counters.length;

  const ZONES = [["A1", "A2"], ["A3", "A4"]];
  const wZ0   = ZONES[0].reduce((s, b) => s + (weights[b] || 0), 0);
  const wZ1   = ZONES[1].reduce((s, b) => s + (weights[b] || 0), 0);
  const base  = Math.floor(N / 2);
  const zCnt  = N % 2 === 0 ? [base, base] : wZ1 >= wZ0 ? [base, base + 1] : [base + 1, base];

  const prevZoneOf = (name: string): number => {
    const pa = (prevOf[name] || []).filter((b) => A_BL.includes(b));
    if (!pa.length) return -1;
    if (ZONES[0].some((b) => pa.includes(b))) return 0;
    if (ZONES[1].some((b) => pa.includes(b))) return 1;
    return -1;
  };

  const remaining = shuffle([...counters]);
  ZONES.forEach((zone, zi) => {
    for (let k = 0; k < zCnt[zi] && remaining.length; k++) {
      let bi = 0, bs = Infinity;
      remaining.forEach((c, i) => {
        const prevZone = prevZoneOf(c.name);
        const ov       = zone.filter((b) => (prevOf[c.name] || []).includes(b)).length;
        const samePen  = prevZone === zi ? 8 : 0;
        const oppBonus = prevZone !== -1 && prevZone !== zi ? -5 : 0;
        const score    = ov * 2 + samePen + oppBonus;
        if (score < bs) { bs = score; bi = i; }
      });
      const winner = remaining.splice(bi, 1)[0];
      zone.forEach((b) => {
        result[b] = [...(result[b] || []), winner.name];
        loadOf[winner.name] += weights[b] || 0;
      });
    }
  });

  A_BL.forEach((abl) => {
    while ((result[abl] || []).length < 2) {
      const cands = [...counters]
        .filter((c) => !(result[abl] || []).includes(c.name))
        .filter((c) => cntA(c.name) < 2)
        .filter((c) => isConsec([...myA(c.name), abl]))
        .sort((a, b) => loadOf[a.name] - loadOf[b.name]);
      if (!cands.length) break;
      const winner = cands[0];
      result[abl] = [...(result[abl] || []), winner.name];
      loadOf[winner.name] += weights[abl] || 0;
    }
  });

  BS_BL.forEach((block) => {
    const adj  = counters.filter((c) => myA(c.name).some((a) => ADJ[a]?.includes(block)));
    const pool = adj.length ? adj : counters;
    const prevOwners = (
      Array.isArray(prev[block]) ? (prev[block] as string[]) : [prev[block] as string]
    ).filter(Boolean);

    const eligible = pool.filter((c) => {
      if (block === "S1") return !(result["S2"] || []).includes(c.name);
      if (block === "S2") return !(result["S1"] || []).includes(c.name);
      return true;
    });
    const finalPool = eligible.length ? eligible : pool;
    const sorted = [...finalPool].sort((a, b) => {
      const ap = prevOwners.includes(a.name) ? 1 : 0;
      const bp = prevOwners.includes(b.name) ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return loadOf[a.name] - loadOf[b.name];
    });
    const winner = sorted[0];
    if (winner) {
      result[block] = [...(result[block] || []), winner.name];
      loadOf[winner.name] += weights[block] || 0;
    }
  });

  return result;
};

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */

export default function AssignPage() {
  const [bulkText,   setBulkText]   = useState("");
  const [singleName, setSingleName] = useState("");
  const [members,    setMembers]    = useState<Member[]>([]);
  const [isReady,    setIsReady]    = useState(false);
  const [activeEvt,  setActiveEvt]  = useState(0);
  const [mode,       setMode]       = useState<"view" | "manual">("view");
  const [selected,   setSelected]   = useState<Member | null>(null);
  const [hovered,    setHovered]    = useState<string | null>(null);
  const [showOut,    setShowOut]    = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [error,      setError]      = useState("");
  const [showImport, setShowImport] = useState(false);
  const [hoveredMbr, setHoveredMbr] = useState<number | null>(null);
  const [srPicker,   setSRPicker]   = useState<SRPickerState | null>(null);
  const [events,     setEvents]     = useState<EventState[]>([
    { assignments: {}, sr: { tcIn: null, tcOut: null, fd: null } },
    { assignments: {}, sr: { tcIn: null, tcOut: null, fd: null } },
  ]);

  /* ── Derived ── */
  const eventMembers = useCallback(
    (ei: number): Member[] => {
      const label = ei === 0 ? "teen" : "youth";
      return members.filter(
        (m) => !m.availability || m.availability === "both" || m.availability === label
      );
    },
    [members]
  );

  const allBlockForEvent = useCallback((ei: number) => eventMembers(ei).slice(0, 2), [eventMembers]);
  const poolForEvent     = useCallback((ei: number) => eventMembers(ei).slice(2),    [eventMembers]);

  const getSRNames = useCallback(
    (ei: number): string[] => {
      const { tcIn, tcOut, fd } = events[ei].sr;
      return [tcIn, tcOut, fd].filter(Boolean) as string[];
    },
    [events]
  );

  const getCounters = useCallback(
    (ei: number): Member[] => {
      const sr = getSRNames(ei);
      return poolForEvent(ei).filter((m) => !sr.includes(m.name));
    },
    [poolForEvent, getSRNames]
  );

  const getAssignees = useCallback(
    (block: string, ei: number = activeEvt): string[] => events[ei].assignments[block] || [],
    [events, activeEvt]
  );

  const aStatus = useMemo(
    () => A_BL.map((bl) => ({ bl, cnt: (events[activeEvt].assignments[bl] || []).length })),
    [events, activeEvt]
  );

  const allAMet = useMemo(() => aStatus.every((s) => s.cnt >= 2), [aStatus]);

  const getMemberBlocks = useCallback(
    (name: string, ei: number = activeEvt): string[] =>
      ORDERED.filter((b) => (events[ei].assignments[b] || []).includes(name)),
    [events, activeEvt]
  );

  const getMemberRole = useCallback(
    (name: string, ei: number = activeEvt): string | null => {
      if (allBlockForEvent(ei).find((m) => m.name === name)) return "ALL BLOCK";
      const { tcIn, tcOut, fd } = events[ei].sr;
      if (tcIn  === name) return SR_ROLES[0];
      if (tcOut === name) return SR_ROLES[1];
      if (fd    === name) return SR_ROLES[2];
      return null;
    },
    [allBlockForEvent, events]
  );

  const colorOf = useCallback(
    (name: string): string => members.find((m) => m.name === name)?.color ?? "#334155",
    [members]
  );

  /* ── Member Actions ── */
  const parseMemberStr = (raw: string) => {
    const tOnly = /\(T\)\s*$/i.test(raw);
    const yOnly = /\(Y\)\s*$/i.test(raw);
    const n0    = raw.replace(/\s*\([TY]\)\s*$/i, "").trim();
    return {
      name:         n0.charAt(0).toUpperCase() + n0.slice(1),
      availability: (tOnly ? "teen" : yOnly ? "youth" : "both") as Member["availability"],
    };
  };

  const parseBulk = () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.replace(/^[\s*•\-\d.]+/, "").trim())
      .filter(Boolean);
    if (!lines.length) return;
    setMembers(
      lines.map((raw, i) => {
        const { name, availability } = parseMemberStr(raw);
        return { id: Date.now() + i, name, color: COLORS[i % COLORS.length], availability };
      })
    );
    setBulkText(""); setIsReady(false); setShowImport(false); setError(""); setSelected(null);
  };

  const addSingle = () => {
    const raw = singleName.trim();
    if (!raw) return;
    const { name, availability } = parseMemberStr(raw);
    setMembers((prev) => [
      ...prev,
      { id: Date.now(), name, color: COLORS[prev.length % COLORS.length], availability },
    ]);
    setSingleName(""); setIsReady(false);
  };

  const removeMember = (id: number) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setIsReady(false); setSelected(null); setError("");
  };

  const moveMember = (id: number, dir: number) => {
    setMembers((prev) => {
      const i = prev.findIndex((m) => m.id === id), j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const a = [...prev]; [a[i], a[j]] = [a[j], a[i]]; return a;
    });
    setIsReady(false);
  };

  /* ── Initialize ── */
  const initialize = () => {
    if (members.length < 5) {
      setError("Minimal 5 anggota: 2 koordinator + 3 peran khusus + 1+ counter"); return;
    }
    const teenN  = eventMembers(0).length;
    const youthN = eventMembers(1).length;
    if (teenN  < 5) { setError(`Anggota untuk Teen kurang (hanya ${teenN}, minimal 5). Cek tanda (Y) yang membatasi.`); return; }
    if (youthN < 5) { setError(`Anggota untuk Youth kurang (hanya ${youthN}, minimal 5). Cek tanda (T) yang membatasi.`); return; }
    setError("");

    const teenPool      = shuffle(poolForEvent(0));
    const sr1           = teenPool.slice(0, 3);
    const sr1Names      = new Set(sr1.map((m) => m.name));
    const youthBase     = poolForEvent(1);
    const youthEligible = youthBase.filter((m) => !sr1Names.has(m.name));
    const youthPool     = shuffle(youthEligible);

    let sr2: Member[];
    if (youthPool.length >= 3) {
      sr2 = youthPool.slice(0, 3);
    } else {
      const fallback = shuffle(youthBase.filter((m) => sr1Names.has(m.name)));
      sr2 = [...youthPool, ...fallback].slice(0, 3);
    }

    setEvents([
      { assignments: {}, sr: { tcIn: sr1[0]?.name ?? null, tcOut: sr1[1]?.name ?? null, fd: sr1[2]?.name ?? null } },
      { assignments: {}, sr: { tcIn: sr2[0]?.name ?? null, tcOut: sr2[1]?.name ?? null, fd: sr2[2]?.name ?? null } },
    ]);
    setIsReady(true); setMode("view"); setSelected(null);
  };

  /* ── Auto Assign ── */
  const runAuto = () => {
    if (!isReady) return;
    const a0 = autoAssignFn(getCounters(0), WEIGHTS[0], {});
    const a1 = autoAssignFn(getCounters(1), WEIGHTS[1], a0);
    setEvents((prev) => [{ ...prev[0], assignments: a0 }, { ...prev[1], assignments: a1 }]);
    setError("");
  };

  const clearAll = () => setEvents((prev) => prev.map((e) => ({ ...e, assignments: {} })));

  /* ── Manual SR ── */
  const setEventSR = (ei: number, role: string, name: string | null) => {
    setEvents((prev) =>
      prev.map((e, i) => (i !== ei ? e : { ...e, sr: { ...e.sr, [role]: name || null } }))
    );
    setSRPicker(null);
  };

  const getSREligible = (ei: number, excludeRole: string): Member[] => {
    const sr    = events[ei].sr;
    const taken = Object.entries(sr)
      .filter(([k]) => k !== excludeRole)
      .map(([, v]) => v)
      .filter(Boolean) as string[];
    return poolForEvent(ei).filter((m) => !taken.includes(m.name));
  };

  /* ── Manual Block Click ── */
  const handleBlockClick = (block: string) => {
    if (mode !== "manual" || !selected || !isReady) return;
    if (getMemberRole(selected.name, activeEvt)) return;
    setError("");

    const cur = getAssignees(block, activeEvt);
    const has = cur.includes(selected.name);
    let next: string[];

    if (has) {
      next = cur.filter((n) => n !== selected.name);
    } else {
      if (A_BL.includes(block)) {
        const myA = getMemberBlocks(selected.name, activeEvt).filter((b) => A_BL.includes(b));
        if (!isConsec([...myA, block])) {
          setError(`Blok A harus berurutan! ${selected.name} ada di [${myA.join(",") || "–"}], tidak bisa tambah ${block}`);
          return;
        }
      }
      if (BS_BL.includes(block)) {
        const myA = getMemberBlocks(selected.name, activeEvt).filter((b) => A_BL.includes(b));
        if (!myA.length) { setError(`${selected.name} harus punya blok A terlebih dahulu`); return; }
        const allowed = myA.flatMap((a) => ADJ[a] || []);
        if (!allowed.includes(block)) {
          setError(`${block} tidak berdekatan dengan blok A [${myA.join(",")}] milik ${selected.name}`);
          return;
        }
      }
      next = [...cur, selected.name];
    }

    const newA = { ...events[activeEvt].assignments };
    if (next.length) newA[block] = next; else delete newA[block];
    setEvents((prev) => prev.map((e, i) => (i === activeEvt ? { ...e, assignments: newA } : e)));
  };

  /* ── Output ── */
  const genOutput = (): string =>
    events
      .map((evt, ei) => {
        const lines: string[] = [EVT_NAMES[ei], ""];
        allBlockForEvent(ei).forEach((m) => lines.push(`• ${m.name} : ALL BLOCK`));
        const { tcIn, tcOut, fd } = evt.sr;
        if (tcIn)  lines.push(`• ${tcIn} : ${SR_ROLES[0]}`);
        if (tcOut) lines.push(`• ${tcOut} : ${SR_ROLES[1]}`);
        if (fd)    lines.push(`• ${fd} : ${SR_ROLES[2]}`);
        getCounters(ei).forEach((c) => {
          const bl = ORDERED.filter((b) => (evt.assignments[b] || []).includes(c.name));
          lines.push(`• ${c.name} : ${bl.length ? bl.join(", ") : "(belum di-assign)"}`);
        });
        return lines.join("\n");
      })
      .join("\n\n");

  const copyOut = async () => {
    try {
      await navigator.clipboard.writeText(genOutput());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  /* ═══════════════════════════════
     SVG BLOCK RENDERER
  ═══════════════════════════════ */

  const renderBlock = (key: string) => {
    const g = GEOM[key];
    if (!g) return null;

    /* ── Main Stage (non-clickable) ── */
    if (g.t === "r" && g.nc) {
      return (
        <g key={key}>
          <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="6"
            fill="#06122A" stroke="#1E40AF" strokeWidth="2.5" />
          <rect x={g.x + 2} y={g.y + 2} width={g.w - 4} height={g.h - 4} rx="5"
            fill="none" stroke="#1E3A8A" strokeWidth="0.5" />
          <text x={g.cx} y={g.cy - 4} textAnchor="middle"
            fill="#93C5FD" fontSize="13" fontWeight="800" letterSpacing="5"
            style={{ fontFamily: "Syne,sans-serif" }}>
            MAIN STAGE
          </text>
          <text x={g.cx} y={g.cy + 12} textAnchor="middle"
            fill="#1E3A8A" fontSize="8" letterSpacing="2"
            style={{ fontFamily: "DM Mono,monospace" }}>
            ↑ SEMUA ARAH KE SINI
          </text>
        </g>
      );
    }

    const assignees  = getAssignees(key, activeEvt);
    const isHov      = hovered === key;
    const isSelConn  = selected && assignees.includes(selected.name);
    const hasAny     = assignees.length > 0;
    const priColor   = hasAny ? colorOf(assignees[0]) : null;
    const stroke     = isSelConn ? "#FCD34D" : priColor || (isHov ? "#475569" : "#0F2A4A");
    const fill       = priColor
      ? priColor + "22"
      : isHov && mode === "manual" && selected && !getMemberRole(selected.name, activeEvt)
      ? "#FFFFFF09"
      : "#030C1CAA";
    const sw    = isHov || isSelConn ? 2.5 : 1.5;
    const arRot = ARROW_ROT[key] ?? 0;

    /* Badge corner positions — works for both rect and polygon */
    const bx = g.t === "r" ? g.x + g.w - 2 : Math.max(...g.pts.map(([x]) => x)) - 2;
    const by = g.t === "r" ? g.y + 4        : Math.min(...g.pts.map(([, y]) => y)) + 12;

    const Shape =
      g.t === "r" ? (
        <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="5"
          fill={fill} stroke={stroke} strokeWidth={sw} />
      ) : (
        <polygon
          points={g.pts.map(([x, y]) => `${x},${y}`).join(" ")}
          fill={fill} stroke={stroke} strokeWidth={sw} />
      );

    return (
      <g
        key={key}
        onClick={() => handleBlockClick(key)}
        onMouseEnter={() => setHovered(key)}
        onMouseLeave={() => setHovered(null)}
        style={{ cursor: mode === "manual" && isReady ? "pointer" : "default" }}
      >
        {Shape}

        {/* Direction arrow (hollow) */}
        <g transform={`translate(${g.cx},${g.cy - 22}) rotate(${arRot})`}>
          <polygon
            points="0,-12 9,-4 5,-4 5,10 -5,10 -5,-4 -9,-4"
            fill="none"
            stroke={hasAny ? priColor + "AA" : "#EF444477"}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </g>

        {/* Block key label */}
        <text x={g.cx} y={g.cy + 5} textAnchor="middle"
          fill={priColor || (isHov ? "#64748B" : "#1E3A5F")}
          fontSize="13" fontWeight="700"
          style={{ fontFamily: "DM Mono,monospace", userSelect: "none" }}>
          {key}
        </text>

        {/* Weight badge */}
        <text x={g.cx} y={g.cy + 18} textAnchor="middle"
          fill="#0F2A4A" fontSize="8"
          style={{ fontFamily: "DM Mono,monospace", userSelect: "none" }}>
          {WEIGHTS[activeEvt][key]}
        </text>

        {/* Assignee colored dots */}
        {assignees.length > 0 &&
          (() => {
            const n       = Math.min(assignees.length, 5);
            const spacing = 14;
            const startX  = g.cx - ((n - 1) * spacing) / 2;
            return assignees.slice(0, n).map((name, i) => (
              <g key={name}>
                <circle cx={startX + i * spacing} cy={g.cy + 30} r="4.5"
                  fill={colorOf(name)} opacity="0.9" />
                {assignees.length === 1 && (
                  <text x={g.cx} y={g.cy + 45} textAnchor="middle"
                    fill={colorOf(name)} fontSize="9" fontWeight="600"
                    style={{ fontFamily: "Syne,sans-serif", userSelect: "none" }}>
                    {name.length > 9 ? name.slice(0, 8) + "…" : name}
                  </text>
                )}
              </g>
            ));
          })()}

        {/* Multi-assignee count */}
        {assignees.length > 1 && (
          <text x={g.cx} y={g.cy + 46} textAnchor="middle"
            fill="#1E3A5F" fontSize="8"
            style={{ fontFamily: "DM Mono,monospace", userSelect: "none" }}>
            {assignees.length} org
          </text>
        )}

        {/* Min-2 badge for A blocks */}
        {A_BL.includes(key) &&
          (() => {
            const cnt = assignees.length;
            const ok  = cnt >= 2;
            const one = cnt === 1;
            const bC  = ok ? "#10B981" : one ? "#F59E0B" : "#EF4444";
            const bBg = ok ? "#05291999" : one ? "#1c140099" : "#1a050599";
            return (
              <g>
                <rect x={bx - 27} y={by - 9} width="29" height="15" rx="4"
                  fill={bBg} stroke={bC} strokeWidth="1.2" />
                <text x={bx - 13} y={by + 2.5} textAnchor="middle"
                  fill={bC} fontSize="9" fontWeight="700"
                  style={{ fontFamily: "DM Mono,monospace", userSelect: "none" }}>
                  {cnt}/2
                </text>
                {!ok && <circle cx={bx - 30} cy={by - 2} r="3.5" fill={bC} opacity="0.9" />}
              </g>
            );
          })()}
      </g>
    );
  };

  /* ── Tooltip (rendered on top of all blocks) ── */
  const renderTooltip = () => {
    if (!hovered || hovered === "MAIN_STAGE") return null;
    const g         = GEOM[hovered];
    if (!g) return null;
    const assignees = getAssignees(hovered, activeEvt);
    const isABlock  = A_BL.includes(hovered);
    const h = (isABlock ? 66 : 48) + Math.max(assignees.length, 1) * 15;
    const w = 148;
    let tx = g.cx - w / 2;
    let ty = g.cy - h - 12;
    tx = Math.max(6, Math.min(830 - w - 6, tx));
    ty = Math.max(6, ty);

    return (
      <g>
        <rect x={tx + 2} y={ty + 2} width={w} height={h} rx="6" fill="black" opacity="0.4" />
        <rect x={tx} y={ty} width={w} height={h} rx="6"
          fill="#060F1E" fillOpacity="0.97"
          stroke={assignees.length > 0 ? colorOf(assignees[0]) + "55" : "#0F2A4A"}
          strokeWidth="1.5" />
        <text x={tx + w / 2} y={ty + 16} textAnchor="middle"
          fill="#1E3A8A" fontSize="9" style={{ fontFamily: "DM Mono,monospace" }}>
          {hovered} · w:{WEIGHTS[activeEvt][hovered]}
        </text>
        <line x1={tx + 10} y1={ty + 22} x2={tx + w - 10} y2={ty + 22}
          stroke="#0F2A4A" strokeWidth="0.5" />
        {assignees.length === 0 ? (
          <text x={tx + w / 2} y={ty + 38} textAnchor="middle"
            fill="#1E3A5F" fontSize="10" style={{ fontFamily: "DM Mono,monospace" }}>
            kosong
          </text>
        ) : (
          assignees.map((name, i) => (
            <g key={name}>
              <circle cx={tx + 14} cy={ty + 32 + i * 15} r="4" fill={colorOf(name)} opacity="0.9" />
              <text x={tx + 24} y={ty + 36 + i * 15}
                fill={colorOf(name)} fontSize="10" fontWeight="600"
                style={{ fontFamily: "Syne,sans-serif" }}>
                {name}
              </text>
            </g>
          ))
        )}
        {A_BL.includes(hovered) &&
          (() => {
            const cnt = assignees.length;
            const ok  = cnt >= 2;
            const col = ok ? "#10B981" : cnt === 1 ? "#F59E0B" : "#EF4444";
            const msg = ok
              ? `✓ ${cnt}/2 min terpenuhi`
              : cnt === 1
              ? "⚠ butuh 1 orang lagi"
              : "✗ belum ada counter";
            return (
              <g>
                <line x1={tx + 8} y1={ty + h - 18} x2={tx + w - 8} y2={ty + h - 18}
                  stroke="#0F2A4A" strokeWidth="0.5" />
                <text x={tx + w / 2} y={ty + h - 6} textAnchor="middle"
                  fill={col} fontSize="8.5" fontWeight="600"
                  style={{ fontFamily: "DM Mono,monospace" }}>
                  {msg}
                </text>
              </g>
            );
          })()}
      </g>
    );
  };

  /* ═══════════════════════════════
     RENDER
  ═══════════════════════════════ */

  const SR_KEYS  = ["tcIn", "tcOut", "fd"] as const;
  const SR_SHORT = ["TC In + AC S1", "TC Out + AC S2", "FD"];

  return (
    <div
      style={{
        height: "100%",
        background: "#050B18",
        color: "#CBD5E1",
        fontFamily: "'Syne','Inter',sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#0F2A4A;border-radius:2px;}
        input::placeholder,textarea::placeholder{color:#1E3A5F;}
        button:hover{filter:brightness(1.15);}
      `}</style>

      {/* ════════════ HEADER ════════════ */}
      <header
        style={{
          background: "#07111E", borderBottom: "1px solid #0A1D35",
          padding: "8px 16px", display: "flex", alignItems: "center",
          gap: "10px", flexShrink: 0, minHeight: "50px", flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>⛪</span>
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#E2E8F0", letterSpacing: "1.5px", fontFamily: "Syne,sans-serif" }}>
            SERVICE ASSIGNMENT
          </span>
        </div>

        {/* Event tabs */}
        {isReady && (
          <div style={{ display: "flex", gap: "3px", background: "#0A1929", borderRadius: "8px", padding: "3px", border: "1px solid #0A1D35" }}>
            {EVT_NAMES.map((name, i) => (
              <button key={i}
                onClick={() => { setActiveEvt(i); setSelected(null); setError(""); }}
                style={{
                  padding: "4px 16px", borderRadius: "5px", border: "none", cursor: "pointer",
                  fontSize: "11px", fontWeight: 700, letterSpacing: "1px", transition: "all 0.2s",
                  background: activeEvt === i ? "#1D4ED8" : "transparent",
                  color: activeEvt === i ? "white" : "#334155",
                  fontFamily: "Syne,sans-serif",
                }}>
                {name.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* A-block min-2 status chips */}
        {isReady && (
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            {aStatus.map(({ bl, cnt }) => {
              const ok  = cnt >= 2;
              const one = cnt === 1;
              const bC  = ok ? "#10B981" : one ? "#F59E0B" : "#EF4444";
              const bBg = ok ? "#05291966" : one ? "#1c140066" : "#1a050566";
              return (
                <div key={bl} style={{ display: "flex", alignItems: "center", gap: "3px", padding: "2px 7px", borderRadius: "5px", background: bBg, border: `1px solid ${bC}44` }}>
                  <span style={{ fontSize: "8px", color: bC, fontWeight: 700, fontFamily: "DM Mono,monospace", letterSpacing: "1px" }}>{bl}</span>
                  <span style={{ fontSize: "8px", color: bC, fontFamily: "DM Mono,monospace" }}>{cnt}/2{ok ? " ✓" : one ? " ⚠" : " ✗"}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {isReady && (
          <>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: "3px", background: "#0A1929", borderRadius: "7px", padding: "3px", border: "1px solid #0A1D35" }}>
              {(["view", "manual"] as const).map((m) => {
                const lbl = m === "view" ? "👁 VIEW" : "✏️ MANUAL";
                return (
                  <button key={m}
                    onClick={() => { setMode(m); setSelected(null); setError(""); }}
                    style={{
                      padding: "4px 10px", borderRadius: "5px", border: "none", cursor: "pointer",
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px",
                      transition: "all 0.2s", fontFamily: "DM Mono,monospace",
                      background: mode === m ? (m === "manual" ? "#B45309" : "#1E3A5F") : "transparent",
                      color: mode === m ? "white" : "#334155",
                    }}>
                    {lbl}
                  </button>
                );
              })}
            </div>

            <button onClick={runAuto}
              style={{ padding: "6px 14px", background: "#1D4ED8", border: "none", borderRadius: "7px", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer", letterSpacing: "1px", fontFamily: "Syne,sans-serif" }}>
              ⚡ AUTO ASSIGN
            </button>

            <button onClick={() => setShowOut((p) => !p)}
              style={{
                padding: "6px 12px",
                background: showOut ? "#064E3B" : "#0A1929",
                border: "1px solid " + (showOut ? "#10B981" : "#0A1D35"),
                borderRadius: "7px",
                color: showOut ? "#10B981" : "#334155",
                fontSize: "11px", fontWeight: 700, cursor: "pointer",
                fontFamily: "DM Mono,monospace", letterSpacing: "0.5px",
              }}>
              📋 OUTPUT
            </button>
          </>
        )}
      </header>

      {/* ════════════ BODY ════════════ */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* ════ SIDEBAR ════ */}
        <aside
          style={{
            width: "265px", flexShrink: 0,
            background: "#07111E", borderRight: "1px solid #0A1D35",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          {/* Input area */}
          <div style={{ padding: "12px", borderBottom: "1px solid #0A1929" }}>
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              <input
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSingle()}
                placeholder="Nama... (T) atau (Y) opsional"
                style={{
                  flex: 1, background: "#0A1929", border: "1px solid #0F2A4A",
                  borderRadius: "6px", padding: "7px 10px", color: "#E2E8F0",
                  fontSize: "12px", outline: "none", fontFamily: "Syne,sans-serif",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#1D4ED8")}
                onBlur={(e)  => (e.target.style.borderColor = "#0F2A4A")}
              />
              <button onClick={addSingle}
                style={{ width: "34px", height: "34px", background: "#1D4ED8", border: "none", borderRadius: "6px", color: "white", fontSize: "18px", cursor: "pointer", fontWeight: 700, lineHeight: "1", flexShrink: 0 }}>
                +
              </button>
            </div>

            <button onClick={() => setShowImport((p) => !p)}
              style={{ background: "none", border: "none", color: "#1E3A5F", fontSize: "9px", cursor: "pointer", padding: "0", letterSpacing: "1px", fontFamily: "DM Mono,monospace" }}>
              {showImport ? "▼" : "▶"} IMPORT DARI TEKS
            </button>

            {showImport && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ fontSize: "8px", color: "#1E3A5F", marginBottom: "5px", lineHeight: 1.6, fontFamily: "DM Mono,monospace" }}>
                  Tambahkan <span style={{ color: "#FBBF24" }}>(T)</span> di akhir nama → hanya Teen.{" "}
                  <span style={{ color: "#93C5FD" }}>(Y)</span> di akhir nama → hanya Youth.{" "}
                  Tanpa tanda → bisa keduanya.
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={"• rafa\n• medelin (T)\n• chen (Y)\nsatu nama per baris"}
                  rows={5}
                  style={{ width: "100%", background: "#0A1929", border: "1px solid #0F2A4A", borderRadius: "6px", padding: "8px", color: "#CBD5E1", fontSize: "11px", resize: "none", outline: "none", fontFamily: "DM Mono,monospace", lineHeight: 1.8 }}
                />
                <button onClick={parseBulk}
                  style={{ width: "100%", marginTop: "4px", padding: "6px", background: "#0F2A4A", border: "1px solid #1E3A5F", borderRadius: "6px", color: "#64748B", fontSize: "10px", cursor: "pointer", fontFamily: "DM Mono,monospace", letterSpacing: "1px" }}>
                  IMPORT ({bulkText.split("\n").filter((l) => l.trim()).length} NAMA)
                </button>
              </div>
            )}
          </div>

          {/* Min-2 rule strip */}
          {isReady && (
            <div style={{ padding: "5px 12px", borderBottom: "1px solid #0A1929", background: "#040D1A", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "7.5px", color: "#0F2A4A", letterSpacing: "1px", fontFamily: "DM Mono,monospace" }}>MIN 2 ORG/BLOK A</span>
              <span style={{ fontSize: "7.5px", fontWeight: 700, marginLeft: "auto", color: allAMet ? "#10B981" : "#F59E0B", fontFamily: "DM Mono,monospace", letterSpacing: "0.5px" }}>
                {allAMet ? "✓ TERPENUHI" : `⚠ ${aStatus.filter((s) => s.cnt < 2).map((s) => s.bl).join(",")} KURANG`}
              </span>
            </div>
          )}

          {/* Member list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {members.length === 0 ? (
              <div style={{ textAlign: "center", color: "#0F2A4A", padding: "30px 10px", fontSize: "10px", lineHeight: 2.5, fontFamily: "DM Mono,monospace", letterSpacing: "1px" }}>
                BELUM ADA ANGGOTA<br />Tambah di atas atau import
              </div>
            ) : (
              <>
                <div style={{ fontSize: "8px", color: "#0F2A4A", marginBottom: "8px", padding: "0 4px", fontFamily: "DM Mono,monospace", letterSpacing: "1px" }}>
                  {members.length} ANGGOTA · 2 TERATAS = KOORDINATOR ALL BLOCK
                </div>

                {members.map((m, i) => {
                  const avail     = m.availability || "both";
                  const evtKey    = activeEvt === 0 ? "teen" : "youth";
                  const isInEvt   = avail === "both" || avail === evtKey;
                  const role      = isInEvt ? getMemberRole(m.name, activeEvt) : null;
                  const blocks    = isInEvt ? getMemberBlocks(m.name, activeEvt) : [];
                  const isSel     = selected?.id === m.id;
                  const isSR      = role && role !== "ALL BLOCK";
                  const isCounter = !role && isInEvt;
                  const w         = blocks.reduce((s, b) => s + (WEIGHTS[activeEvt][b] || 0), 0);
                  const isHov     = hoveredMbr === m.id;
                  const isABTeen  = allBlockForEvent(0).some((mb) => mb.name === m.name);
                  const isABYouth = allBlockForEvent(1).some((mb) => mb.name === m.name);
                  const isABAny   = isABTeen || isABYouth;
                  const abLabel   = isABTeen && isABYouth ? "ALL" : isABTeen ? "ALL-T" : "ALL-Y";

                  return (
                    <div
                      key={m.id}
                      onMouseEnter={() => setHoveredMbr(m.id)}
                      onMouseLeave={() => setHoveredMbr(null)}
                      style={{
                        borderRadius: "8px", marginBottom: "3px",
                        border: "1px solid " + (isSel ? "#1D4ED866" : isHov ? "#1E3A5F44" : "transparent"),
                        overflow: "hidden",
                        opacity: !isInEvt ? 0.28 : isSR ? 0.65 : 1,
                        transition: "all 0.15s",
                        background: isSel ? "#0A1929" : isHov && isInEvt ? "#07111E" : "transparent",
                      }}
                    >
                      {/* Main row */}
                      <div
                        onClick={() => { if (mode === "manual" && isCounter && isInEvt) { setSelected(isSel ? null : m); setError(""); } }}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 8px 6px", cursor: mode === "manual" && isCounter ? "pointer" : "default" }}
                      >
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0, background: m.color, boxShadow: `0 0 7px ${m.color}77` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#E2E8F0" }}>{m.name}</span>
                            {isABAny && <span style={{ fontSize: "7px", padding: "1px 5px", borderRadius: "3px", background: "#78350F44", color: "#FCD34D", fontFamily: "DM Mono,monospace", letterSpacing: "1px" }}>{abLabel}</span>}
                            {isSR    && <span style={{ fontSize: "7px", padding: "1px 5px", borderRadius: "3px", background: "#0F2A4A", color: "#334155", fontFamily: "DM Mono,monospace" }}>SR</span>}
                            {avail !== "both" && (
                              <span style={{ fontSize: "7px", padding: "1px 5px", borderRadius: "3px", background: avail === "teen" ? "#78350F55" : "#1E3A8A55", color: avail === "teen" ? "#FBBF24" : "#93C5FD", fontFamily: "DM Mono,monospace", letterSpacing: "1px", border: "1px solid " + (avail === "teen" ? "#FBBF2444" : "#93C5FD44") }}>
                                {avail === "teen" ? "T" : "Y"}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "9px", marginTop: "1px", color: isSR ? "#1E3A5F" : role ? "#475569" : blocks.length ? m.color + "BB" : "#1E3A5F", fontFamily: "DM Mono,monospace", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                            {!isInEvt
                              ? <span style={{ color: "#1E3A5F", fontStyle: "italic" }}>tidak ikut {EVT_NAMES[activeEvt]}</span>
                              : role || (blocks.length ? `${blocks.join(" · ")} (${w.toFixed(2)})` : "–")}
                          </div>
                        </div>
                        <span style={{ fontSize: "9px", color: "#1E3A5F", fontFamily: "DM Mono,monospace", flexShrink: 0 }}>#{i + 1}</span>
                      </div>

                      {/* Hover action bar */}
                      {isHov && (
                        <div style={{ display: "flex", gap: "4px", padding: "5px 8px", borderTop: "1px solid #0F2A4A", background: "#040D1A" }}>
                          <button onClick={(e) => { e.stopPropagation(); moveMember(m.id, -1); }}
                            style={{ flex: 1, padding: "5px 4px", background: "#0A1929", border: "1px solid #0F2A4A", borderRadius: "5px", color: "#475569", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                            <span style={{ fontSize: "12px" }}>↑</span><span style={{ fontSize: "8px", letterSpacing: "0.5px" }}>NAIK</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); moveMember(m.id, 1); }}
                            style={{ flex: 1, padding: "5px 4px", background: "#0A1929", border: "1px solid #0F2A4A", borderRadius: "5px", color: "#475569", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                            <span style={{ fontSize: "12px" }}>↓</span><span style={{ fontSize: "8px", letterSpacing: "0.5px" }}>TURUN</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); removeMember(m.id); }}
                            style={{ flex: 1, padding: "5px 4px", background: "#1C0909", border: "1px solid #7F1D1D55", borderRadius: "5px", color: "#EF4444", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                            <span style={{ fontSize: "12px" }}>×</span><span style={{ fontSize: "8px", letterSpacing: "0.5px" }}>HAPUS</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* ── PERAN KHUSUS (manual SR assignment) ── */}
          {isReady && (() => {
            const sr         = events[activeEvt].sr;
            const pickerOpen = srPicker && srPicker.ei === activeEvt;

            return (
              <div style={{ borderTop: "1px solid #0A1929", flexShrink: 0 }}>
                <div style={{ padding: "6px 12px 4px", background: "#040D1A", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: "7.5px", color: "#1E3A5F", letterSpacing: "1.5px", fontFamily: "DM Mono,monospace" }}>
                    PERAN KHUSUS — {EVT_NAMES[activeEvt].toUpperCase()}
                  </span>
                </div>

                <div style={{ padding: "4px 8px 6px", background: "#040D1A", display: "flex", flexDirection: "column", gap: "3px" }}>
                  {SR_KEYS.map((key, ki) => {
                    const assigned = sr[key];
                    const aColor   = assigned ? colorOf(assigned) : null;
                    const isOpen   = !!(pickerOpen && srPicker.role === key);
                    const eligible = getSREligible(activeEvt, key);

                    return (
                      <div key={key} style={{ position: "relative" }}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 7px", borderRadius: "6px", background: isOpen ? "#0A1929" : "#060F1E", border: "1px solid " + (isOpen ? "#1D4ED855" : "#0F2A4A"), cursor: "pointer" }}
                          onClick={() => setSRPicker(isOpen ? null : { ei: activeEvt, role: key })}
                        >
                          {aColor
                            ? <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: aColor, boxShadow: `0 0 5px ${aColor}66`, flexShrink: 0 }} />
                            : <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0F2A4A", border: "1px dashed #1E3A5F", flexShrink: 0 }} />
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "7.5px", color: "#1E3A5F", letterSpacing: "0.5px", fontFamily: "DM Mono,monospace" }}>{SR_SHORT[ki]}</div>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: aColor || "#334155", marginTop: "1px" }}>
                              {assigned || <span style={{ fontSize: "8px", color: "#1E3A5F", fontStyle: "italic" }}>belum di-assign</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: "8px", color: "#1E3A5F", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                        </div>

                        {isOpen && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "#060F1E", border: "1px solid #1D4ED855", borderTop: "none", borderRadius: "0 0 6px 6px", maxHeight: "140px", overflowY: "auto", boxShadow: "0 8px 24px #000A" }}>
                            <div
                              onClick={() => setEventSR(activeEvt, key, null)}
                              style={{ padding: "6px 10px", fontSize: "9px", color: "#475569", cursor: "pointer", borderBottom: "1px solid #0F2A4A", fontFamily: "DM Mono,monospace", letterSpacing: "0.5px" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#0A1929")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              — Kosongkan slot ini
                            </div>
                            {eligible.length === 0 && (
                              <div style={{ padding: "8px 10px", fontSize: "9px", color: "#1E3A5F", fontFamily: "DM Mono,monospace" }}>Tidak ada anggota tersedia</div>
                            )}
                            {eligible.map((mb) => (
                              <div
                                key={mb.id}
                                onClick={() => setEventSR(activeEvt, key, mb.name)}
                                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", cursor: "pointer", background: assigned === mb.name ? "#0A1929" : "transparent", borderBottom: "1px solid #0A1929" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#0A1929")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = assigned === mb.name ? "#0A1929" : "transparent")}
                              >
                                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: mb.color, boxShadow: `0 0 5px ${mb.color}66`, flexShrink: 0 }} />
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#E2E8F0" }}>{mb.name}</span>
                                {assigned === mb.name && <span style={{ marginLeft: "auto", fontSize: "8px", color: "#10B981" }}>✓ terpilih</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Bottom controls */}
          <div style={{ padding: "10px", borderTop: "1px solid #0A1929" }}>
            {error && (
              <div style={{ background: "#1C0909", border: "1px solid #7F1D1D44", borderRadius: "6px", padding: "8px", fontSize: "9px", color: "#FCA5A5", marginBottom: "8px", lineHeight: 1.6, fontFamily: "DM Mono,monospace" }}>
                ⚠ {error}
              </div>
            )}

            {mode === "manual" && isReady && (
              <div style={{ background: "#1A1200", border: "1px solid #78350F55", borderRadius: "6px", padding: "8px", fontSize: "9px", color: "#FDE68A", marginBottom: "8px", lineHeight: 1.7, fontFamily: "DM Mono,monospace" }}>
                {selected ? (
                  <>
                    <span style={{ color: "#78350F" }}>MEMILIH: </span>
                    <strong style={{ color: selected.color }}>{selected.name.toUpperCase()}</strong>
                    <br />Klik blok di peta untuk assign/unassign
                  </>
                ) : "Klik nama counter untuk mulai assign manual"}
              </div>
            )}

            {!isReady ? (
              <button onClick={initialize}
                style={{ width: "100%", padding: "9px", background: "#1D4ED8", border: "none", borderRadius: "7px", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer", letterSpacing: "1.5px", fontFamily: "Syne,sans-serif" }}>
                🚀 INITIALIZE EVENTS
              </button>
            ) : (
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={initialize}
                  style={{ flex: 1, padding: "7px 4px", background: "#0A1929", border: "1px solid #0F2A4A", borderRadius: "6px", color: "#334155", fontSize: "9px", cursor: "pointer", fontFamily: "DM Mono,monospace", letterSpacing: "0.5px" }}>
                  🎲 RE-ROLL SR
                </button>
                <button onClick={clearAll}
                  style={{ flex: 1, padding: "7px 4px", background: "#0A1929", border: "1px solid #0F2A4A", borderRadius: "6px", color: "#334155", fontSize: "9px", cursor: "pointer", fontFamily: "DM Mono,monospace", letterSpacing: "0.5px" }}>
                  🗑 CLEAR
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ════ MAIN AREA ════ */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

          {/* SVG Map */}
          <div style={{ flex: 1, overflow: "hidden", background: "#030810", position: "relative", minHeight: 0 }}>
            {!isReady ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "14px" }}>
                <div style={{ fontSize: "48px", opacity: 0.12 }}>🗺️</div>
                <div style={{ fontSize: "10px", color: "#0F2A4A", fontFamily: "DM Mono,monospace", letterSpacing: "2px", textAlign: "center", lineHeight: 2.5 }}>
                  TAMBAH ANGGOTA<br />KLIK &quot;INITIALIZE EVENTS&quot;
                </div>
              </div>
            ) : (
              <svg
                viewBox="0 0 830 490"
                style={{ width: "100%", height: "100%", display: "block" }}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
                    <circle cx="13" cy="13" r="0.65" fill="#0B1E35" opacity="0.9" />
                  </pattern>
                  <radialGradient id="stageGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect width="830" height="490" fill="url(#dots)" />
                <ellipse cx="415" cy="54" rx="240" ry="70" fill="url(#stageGlow)" />

                {/* Connecting lines from A blocks → main stage */}
                {A_BL.map((key) => {
                  const g         = GEOM[key];
                  const assignees = getAssignees(key, activeEvt);
                  const col       = assignees.length > 0 ? colorOf(assignees[0]) + "33" : "#0B1E35";
                  return (
                    <line key={key}
                      x1={g.cx} y1={g.cy - 28} x2="415" y2="96"
                      stroke={col} strokeWidth="1" strokeDasharray="6,5" opacity="0.7" />
                  );
                })}

                {/* All blocks */}
                {Object.keys(GEOM).map((key) => renderBlock(key))}

                {/* Tooltip layer (on top) */}
                {renderTooltip()}

                <text x="824" y="486" textAnchor="end" fill="#0B1E35" fontSize="8"
                  style={{ fontFamily: "DM Mono,monospace" }}>
                  bobot blok: {EVT_NAMES[activeEvt]}
                </text>
              </svg>
            )}
          </div>

          {/* Output panel */}
          {showOut && isReady && (
            <div style={{ height: "215px", background: "#07111E", borderTop: "1px solid #0A1929", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #0A1929" }}>
                <span style={{ fontSize: "9px", fontWeight: 600, color: "#1E3A5F", fontFamily: "DM Mono,monospace", letterSpacing: "1.5px" }}>OUTPUT TEKS</span>
                <button onClick={copyOut}
                  style={{
                    padding: "4px 12px",
                    background: copied ? "#064E3B" : "#0A1929",
                    border: "1px solid " + (copied ? "#10B981" : "#0F2A4A"),
                    borderRadius: "5px",
                    color: copied ? "#10B981" : "#334155",
                    fontSize: "9px", cursor: "pointer", fontWeight: 700,
                    fontFamily: "DM Mono,monospace", letterSpacing: "1px", transition: "all 0.2s",
                  }}>
                  {copied ? "✓ DISALIN" : "SALIN"}
                </button>
              </div>
              <pre style={{ flex: 1, overflowY: "auto", padding: "12px 16px", fontSize: "11px", color: "#334155", lineHeight: 2, whiteSpace: "pre-wrap", margin: 0, fontFamily: "DM Mono,monospace" }}>
                {genOutput()}
              </pre>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}