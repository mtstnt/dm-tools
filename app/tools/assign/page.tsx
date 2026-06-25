// app/tools/assign/page.tsx
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  collection,
  setDoc,
  doc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */

interface Member {
  id: number;
  name: string;
  nij?: number;
  email?: string;
  nickname?: string;
  color: string;
  availability: "both" | "teen" | "youth";
  role?: "Member" | "SPV" | "PIC";
  isAdmin?: boolean;
  order?: number; // ← NEW: persisted to Firestore for stable ordering
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
  A2:  { t: "r", x: 268, y: 108, w: 163, h: 183, cx: 349, cy: 199 },
  A3:  { t: "p", pts: [[456,108],[594,128],[592,268],[530,292],[444,254]],     cx: 523, cy: 210 },
  A4:  { t: "p", pts: [[614,115],[732,138],[727,290],[612,292]],               cx: 671, cy: 208 },
  A1:  { t: "p", pts: [[84,125],[246,108],[258,252],[196,280],[82,262]],        cx: 173,  cy: 205 },
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
  const [copied,     setCopied]     = useState<null | "ALL" | "TEEN" | "YOUTH">(null);
  const [error,      setError]      = useState("");
  const [showImport, setShowImport] = useState(false);
  const [hoveredMbr, setHoveredMbr] = useState<number | null>(null);
  const [srPicker,   setSRPicker]   = useState<SRPickerState | null>(null);
  const [events,     setEvents]     = useState<EventState[]>([
    { assignments: {}, sr: { tcIn: null, tcOut: null, fd: null } },
    { assignments: {}, sr: { tcIn: null, tcOut: null, fd: null } },
  ]);

  /* ─────────────────────────────────────────────
     FIRESTORE REAL-TIME SYNC
     Loads the "members" collection once on mount
     and keeps it in sync via onSnapshot.
  ───────────────────────────────────────────── */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "members"),
      (snap) => {
        const loaded = snap.docs
          .map((d) => d.data() as Member)
          // Sort by `order` field (falls back to `id` for legacy docs without it)
          .sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id));
        setMembers(loaded);
      },
      (err) => {
        console.error("Firestore onSnapshot error:", err);
      }
    );
    return () => unsub();
  }, []); // runs once on mount

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
    (name: string): string => members.find((m) => m.name === name)?.color ?? "var(--color-muted-foreground)",
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

  // ── parseBulk: writes directly to Firestore "members" collection ──
  const parseBulk = () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.replace(/^[\s*•\-\d.]+/, "").trim())
      .filter(Boolean);
    if (!lines.length) return;

    const startOrder = members.length; // base index for new members
    const rows = lines.map((raw, i) => {
      const { name, availability } = parseMemberStr(raw);
      return {
        id:           Date.now() + i,
        name,
        color:        COLORS[(startOrder + i) % COLORS.length],
        availability,
        order:        startOrder + i, // persisted for stable ordering
      };
    });

    const doWrite = async () => {
      try {
        await Promise.all(
          rows.map((r) => setDoc(doc(db, "members", String(r.id)), { ...r }))
        );
      } catch (e) {
        console.error("Firestore bulk write error:", e);
      }
      // Optimistic local update; onSnapshot will reconcile
      setMembers((prev) => [...prev, ...rows]);
      setBulkText(""); setIsReady(false); setShowImport(false); setError(""); setSelected(null);
    };
    void doWrite();
  };

  // ── addSingle: writes directly to Firestore "members" collection ──
  const addSingle = () => {
    const raw = singleName.trim();
    if (!raw) return;
    const { name, availability } = parseMemberStr(raw);
    const order = members.length;
    const m: Member = {
      id: Date.now(),
      name,
      color: COLORS[order % COLORS.length],
      availability,
      order, // persisted for stable ordering
    };
    const doWrite = async () => {
      try { await setDoc(doc(db, "members", String(m.id)), { ...m }); }
      catch (e) { console.error("Firestore add error:", e); }
      // Optimistic local update; onSnapshot will reconcile
      setMembers((prev) => [...prev, m]);
      setSingleName(""); setIsReady(false);
    };
    void doWrite();
  };

  // ── removeMember: deletes from Firestore ──
  const removeMember = (id: number) => {
    const doRemove = async () => {
      try { await deleteDoc(doc(db, "members", String(id))); }
      catch (e) { console.error("Firestore delete error:", e); }
      // Optimistic local update; onSnapshot will reconcile
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setIsReady(false); setSelected(null); setError("");
    };
    void doRemove();
  };

  // ── moveMember: swaps `order` fields atomically via writeBatch ──
  const moveMember = (id: number, dir: number) => {
    const i = members.findIndex((m) => m.id === id);
    const j = i + dir;
    if (j < 0 || j >= members.length) return;

    const mA = members[i];
    const mB = members[j];

    // Optimistic local update for instant UI response
    setMembers((prev) => {
      const a = [...prev];
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
    setIsReady(false);

    // Atomic Firestore batch: swap order fields
    void (async () => {
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, "members", String(mA.id)), { order: j });
        batch.update(doc(db, "members", String(mB.id)), { order: i });
        await batch.commit();
      } catch (e) {
        console.error("Firestore move error:", e);
      }
    })();
  };

  // ── toggleAdmin: accessible to everyone, no role check ──
  const toggleAdmin = (id: number) => {
    const member = members.find((m) => m.id === id);
    if (!member) return;
    const newVal = !member.isAdmin;

    // Optimistic local update
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isAdmin: newVal } : m))
    );

    void (async () => {
      try {
        await updateDoc(doc(db, "members", String(id)), { isAdmin: newVal });
      } catch (e) {
        console.error("Firestore toggleAdmin error:", e);
        // Revert on failure
        setMembers((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isAdmin: !newVal } : m))
        );
      }
    })();
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
  const genOutput = (ei?: number): string => {
    if (typeof ei === "number") {
      const evt = events[ei];
      const lines: string[] = [];
      lines.push(EVT_NAMES[ei]);
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
    }
    return [genOutput(0), genOutput(1)].join("\n\n");
  };

  const copyOut = async (which: "ALL" | "TEEN" | "YOUTH") => {
    try {
      const text = which === "ALL" ? genOutput() : genOutput(which === "TEEN" ? 0 : 1);
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  /* ═══════════════════════════════
     SVG BLOCK RENDERER
  ═══════════════════════════════ */

  const renderBlock = (key: string) => {
    const g = GEOM[key];
    if (!g) return null;

    if (g.t === "r" && g.nc) {
      return (
        <g key={key}>
          <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="6"
            fill="var(--color-card)" stroke="var(--color-primary)" strokeWidth="2.5" />
          <rect x={g.x + 2} y={g.y + 2} width={g.w - 4} height={g.h - 4} rx="5"
            fill="none" stroke="var(--color-sidebar-border)" strokeWidth="0.5" />
          <text x={g.cx} y={g.cy - 4} textAnchor="middle"
            fill="var(--color-sidebar-primary)" fontSize="13" fontWeight="800" letterSpacing="5"
            style={{ fontFamily: "Syne,sans-serif" }}>
            MAIN STAGE
          </text>
          <text x={g.cx} y={g.cy + 12} textAnchor="middle"
            fill="var(--color-sidebar-primary)" fontSize="8" letterSpacing="2"
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
    const stroke     = isSelConn ? "var(--assign-warn)" : priColor || (isHov ? "var(--color-muted-foreground)" : "var(--color-sidebar-border)");
    const fill       = priColor
      ? priColor + "22"
      : isHov && mode === "manual" && selected && !getMemberRole(selected.name, activeEvt)
      ? "rgba(255,255,255,0.06)"
      : "var(--assign-dim)";
    const sw    = isHov || isSelConn ? 2.5 : 1.5;
    const arRot = ARROW_ROT[key] ?? 0;

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

        <g transform={`translate(${g.cx},${g.cy - 22}) rotate(${arRot})`}>
          <polygon
            points="0,-12 9,-4 5,-4 5,10 -5,10 -5,-4 -9,-4"
            fill="none"
            stroke={hasAny ? priColor + "AA" : "var(--assign-fail)"}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </g>

        <text x={g.cx} y={g.cy + 5} textAnchor="middle"
          fill={priColor || (isHov ? "var(--color-muted-foreground)" : "var(--color-sidebar-foreground)")}
          fontSize="13" fontWeight="700"
          style={{ fontFamily: "DM Mono,monospace", userSelect: "none" }}>
          {key}
        </text>

        <text x={g.cx} y={g.cy + 18} textAnchor="middle"
          fill="var(--color-sidebar-border)" fontSize="8"
          style={{ fontFamily: "DM Mono,monospace", userSelect: "none" }}>
          {WEIGHTS[activeEvt][key]}
        </text>

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

        {assignees.length > 1 && (
          <text x={g.cx} y={g.cy + 46} textAnchor="middle"
            fill="var(--color-sidebar-foreground)" fontSize="8"
            style={{ fontFamily: "DM Mono,monospace", userSelect: "none" }}>
            {assignees.length} org
          </text>
        )}

        {A_BL.includes(key) &&
          (() => {
            const cnt = assignees.length;
            const ok  = cnt >= 2;
            const one = cnt === 1;
            const bC  = ok ? "var(--assign-success)" : one ? "var(--assign-warn)" : "var(--assign-fail)";
            const bBg = ok ? "rgba(16,185,129,0.15)" : one ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)";
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
          fill="var(--color-popover)" fillOpacity="0.97"
          stroke={assignees.length > 0 ? colorOf(assignees[0]) + "55" : "var(--color-sidebar-border)"}
          strokeWidth="1.5" />
        <text x={tx + w / 2} y={ty + 16} textAnchor="middle"
          fill="var(--color-sidebar-primary)" fontSize="9" style={{ fontFamily: "DM Mono,monospace" }}>
          {hovered} · w:{WEIGHTS[activeEvt][hovered]}
        </text>
        <line x1={tx + 10} y1={ty + 22} x2={tx + w - 10} y2={ty + 22}
          stroke="var(--color-sidebar-border)" strokeWidth="0.5" />
        {assignees.length === 0 ? (
          <text x={tx + w / 2} y={ty + 38} textAnchor="middle"
            fill="var(--color-sidebar-foreground)" fontSize="10" style={{ fontFamily: "DM Mono,monospace" }}>
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
            const col = ok ? "var(--assign-success)" : cnt === 1 ? "var(--assign-warn)" : "var(--assign-fail)";
            const msg = ok
              ? `✓ ${cnt}/2 min terpenuhi`
              : cnt === 1
              ? "⚠ butuh 1 orang lagi"
              : "✗ belum ada counter";
            return (
              <g>
                <line x1={tx + 8} y1={ty + h - 18} x2={tx + w - 8} y2={ty + h - 18}
                  stroke="var(--assign-sep)" strokeWidth="0.5" />
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
    <div className="assign-page"
      style={{
        height: "100%",
        color: "var(--color-foreground)",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        .assign-page {
          --assign-success: #10B981;
          --assign-warn: #F59E0B;
          --assign-fail: #EF4444;
          --assign-dim: var(--color-card);
          --assign-availability-teen: #FBBF24;
          --assign-availability-youth: #93C5FD;
          --assign-availability-teen-bg: #78350F55;
          --assign-availability-youth-bg: #1E3A8A55;
          --assign-availability-teen-border: #FBBF2444;
          --assign-availability-youth-border: #93C5FD44;
          --assign-ab-bg: #78350F44;
          --assign-ab-fg: #FCD34D;
          --assign-admin-bg: rgba(234,179,8,0.15);
          --assign-admin-fg: #EAB308;
          --assign-admin-border: rgba(234,179,8,0.3);
          --assign-sep: #0F2A4A;
          --assign-bobot-text: #0B1E35;
          --assign-manual-bg: #1A1200;
          --assign-manual-border: #78350F55;
          --assign-manual-text: #FDE68A;
          --assign-manual-accent: #78350F;
          --assign-error-bg: #1C0909;
          --assign-error-border: #7F1D1D44;
          --assign-error-text: #FCA5A5;
        }
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:var(--color-sidebar-border);border-radius:2px;}
        input::placeholder,textarea::placeholder{color:var(--color-muted-foreground);}
        button:hover{filter:brightness(1.05);}
      `}</style>

      <div className="flex flex-col gap-6 animate-stagger p-0">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.1]" style={{margin:0}}>
            SERVICE ASSIGNMENT
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground" style={{marginTop:6}}>
            Atur penempatan volunteer dan peran khusus. Tambahkan anggota lalu klik "INITIALIZE EVENTS".
          </p>
        </div>

        <Card className="h-full">
          {/* ════════════ HEADER ════════════ */}
          <CardHeader className="px-4 py-3 bg-sidebar border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <span className="text-lg">⛪</span>
              <div>
                <CardTitle className="font-display">SERVICE ASSIGNMENT</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Atur penempatan volunteer dan peran khusus.</CardDescription>
              </div>

              {isReady && (
                <div className="ml-4 flex items-center gap-2 bg-input rounded-md p-1 border border-sidebar-border">
                  {EVT_NAMES.map((name, i) => (
                    <Button key={i} variant={activeEvt === i ? "default" : "ghost"} size="sm"
                      onClick={() => { setActiveEvt(i); setSelected(null); setError(""); }}>
                      {name.toUpperCase()}
                    </Button>
                  ))}
                </div>
              )}

              {isReady && (
                <div className="ml-2 flex items-center gap-2 flex-wrap">
                  {aStatus.map(({ bl, cnt }) => {
                    const ok = cnt >= 2;
                    const one = cnt === 1;
                    const bC = ok ? "var(--assign-success)" : one ? "var(--assign-warn)" : "var(--assign-fail)";
                    const bBg = ok ? "rgba(16,185,129,0.12)" : one ? "rgba(245,158,11,0.10)" : "rgba(239,68,68,0.10)";
                    return (
                      <div key={bl} style={{ display:"flex", alignItems:"center", gap:"3px", padding:"2px 7px", borderRadius:"5px", background:bBg, border:`1px solid ${bC}44` }}>
                        <span style={{ fontSize:"8px", color:bC, fontWeight:700, fontFamily:"DM Mono,monospace", letterSpacing:"1px" }}>{bl}</span>
                        <span style={{ fontSize:"8px", color:bC, fontFamily:"DM Mono,monospace" }}>{cnt}/2{ok?" ✓":one?" ⚠":" ✗"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {isReady && (
              <CardAction>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-input rounded-md p-1 border border-sidebar-border">
                    {(["view", "manual"] as const).map((m) => (
                      <Button key={m} variant={mode === m ? "default" : "ghost"} size="sm"
                        onClick={() => { setMode(m); setSelected(null); setError(""); }}>
                        {m === "view" ? "👁 VIEW" : "✏️ MANUAL"}
                      </Button>
                    ))}
                  </div>
                  <Button onClick={runAuto}>⚡ AUTO ASSIGN</Button>
                  <Button variant="outline" onClick={() => setShowOut((p) => !p)}>📋 OUTPUT</Button>
                </div>
              </CardAction>
            )}
          </CardHeader>

          {/* ════════════ BODY ════════════ */}
          <CardContent className="p-0 flex-1">
            <div className="flex flex-1 overflow-hidden min-h-0">

              {/* ════ SIDEBAR ════ */}
              <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden">

                {/* Input area */}
                <div className="px-3 pb-3 border-b border-sidebar-border">
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSingle()}
                      placeholder="Nama... (T) atau (Y) opsional"
                    />
                    <Button size="icon" onClick={addSingle}>+</Button>
                  </div>

                  <button onClick={() => setShowImport((p) => !p)}
                    className="text-[9px] text-sidebar-foreground font-mono p-0">
                    {showImport ? "▼" : "▶"} IMPORT DARI TEKS
                  </button>

                  {showImport && (
                    <div className="mt-2">
                      <div className="text-[8px] text-muted-foreground mb-1.5 leading-6 font-mono">
                        Tambahkan <span style={{color:"var(--assign-availability-teen)"}}>(T)</span> di akhir nama → hanya Teen.{" "}
                        <span style={{color:"var(--assign-availability-youth)"}}>(Y)</span> di akhir nama → hanya Youth.
                      </div>
                      <Textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder={"• rafa\n• medelin (T)\n• chen (Y)\nsatu nama per baris"}
                        rows={5}
                        className="w-full"
                      />
                      <Button variant="outline" className="w-full mt-2" onClick={parseBulk}>
                        IMPORT ({bulkText.split("\n").filter((l) => l.trim()).length} NAMA)
                      </Button>
                    </div>
                  )}
                </div>

                {/* Min-2 rule strip */}
                {isReady && (
                  <div style={{ padding:"5px 12px", borderBottom:"1px solid var(--color-sidebar-border)", background:"var(--color-card)", display:"flex", alignItems:"center", gap:"8px" }}>
                    <span style={{ fontSize:"7.5px", color:"var(--color-muted-foreground)", letterSpacing:"1px", fontFamily:"var(--font-mono)" }}>MIN 2 ORG/BLOK A</span>
                    <span style={{ fontSize:"7.5px", fontWeight:700, marginLeft:"auto", color: allAMet ? "var(--color-primary)" : "var(--color-destructive)", fontFamily:"var(--font-mono)", letterSpacing:"0.5px" }}>
                      {allAMet ? "✓ TERPENUHI" : `⚠ ${aStatus.filter((s)=>s.cnt<2).map((s)=>s.bl).join(",")} KURANG`}
                    </span>
                  </div>
                )}

                {/* Member list */}
                <div className="flex-1 overflow-y-auto p-2">
                  {members.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 px-2 text-[10px] leading-7 font-mono tracking-wide">
                      BELUM ADA ANGGOTA<br />Tambah di atas atau import
                    </div>
                  ) : (
                    <>
                      <div className="text-[8px] text-muted-foreground mb-2 px-1 font-mono tracking-wide">
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
                            className={`rounded-lg mb-1 overflow-hidden transition-all ${!isInEvt ? "opacity-30" : isSR ? "opacity-65" : "opacity-100"}`}
                            style={{
                              border: isSel ? "1px solid var(--color-primary)" : isHov ? "1px solid var(--color-muted-foreground)" : "1px solid transparent",
                              background: isSel ? "var(--color-card)" : isHov && isInEvt ? "var(--color-input)" : "transparent",
                            }}
                          >
                            {/* Main row */}
                            <div
                              onClick={() => { if (mode === "manual" && isCounter && isInEvt) { setSelected(isSel ? null : m); setError(""); } }}
                              className={`flex items-center gap-2 p-2 ${mode === "manual" && isCounter ? "cursor-pointer" : "cursor-default"}`}
                            >
                              <div style={{ width:"10px", height:"10px", borderRadius:"50%", flexShrink:0, background:m.color, boxShadow:`0 0 7px ${m.color}77` }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[12px] font-semibold text-foreground">{m.name}</span>

                                  {/* isAdmin badge — visible to all */}
                                  {m.isAdmin && (
                                    <span className="text-[7px] px-1 rounded-sm font-mono" style={{
                                      background: "var(--assign-admin-bg)",
                                      color: "var(--assign-admin-fg)",
                                      border: "1px solid var(--assign-admin-border)",
                                      letterSpacing: "1px",
                                    }}>
                                      ADMIN
                                    </span>
                                  )}

                                  {isABAny && (
                                    <span className="text-[7px] px-1 rounded-sm font-mono" style={{ background:"var(--assign-ab-bg)", color:"var(--assign-ab-fg)", letterSpacing:"1px" }}>
                                      {abLabel}
                                    </span>
                                  )}
                                  {isSR && (
                                    <span className="text-[7px] px-1 rounded-sm bg-sidebar-border text-muted-foreground font-mono">SR</span>
                                  )}
                                  {avail !== "both" && (
                                    <span className="text-[7px] px-1 rounded-sm font-mono" style={{
                                      background: avail === "teen" ? "var(--assign-availability-teen-bg)" : "var(--assign-availability-youth-bg)",
                                      color: avail === "teen" ? "var(--assign-availability-teen)" : "var(--assign-availability-youth)",
                                      letterSpacing: "1px",
                                      border: avail === "teen" ? "1px solid var(--assign-availability-teen-border)" : "1px solid var(--assign-availability-youth-border)",
                                    }}>
                                      {avail === "teen" ? "T" : "Y"}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize:"9px", marginTop:"1px", color: isSR ? "var(--color-sidebar-foreground)" : role ? "var(--color-muted-foreground)" : blocks.length ? m.color + "BB" : "var(--color-sidebar-foreground)", fontFamily:"DM Mono,monospace", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                                  {!isInEvt
                                    ? <span className="text-muted-foreground italic">tidak ikut {EVT_NAMES[activeEvt]}</span>
                                    : role || (blocks.length ? `${blocks.join(" · ")} (${w.toFixed(2)})` : "–")}
                                </div>
                              </div>
                              <span className="text-[9px] text-sidebar-foreground font-mono flex-shrink-0">#{i + 1}</span>
                            </div>

                            {/* Hover action bar — accessible to everyone, no role check */}
                            {isHov && (
                              <div className="flex gap-1.5 p-2 border-t border-sidebar-border bg-popover flex-wrap">
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveMember(m.id, -1); }}
                                  className="flex-1 px-2 py-1 bg-input border border-sidebar-border rounded-md text-muted-foreground text-[10px] cursor-pointer flex items-center justify-center gap-1">
                                  <span className="text-[12px]">↑</span>
                                  <span className="text-[8px] tracking-wider">NAIK</span>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveMember(m.id, 1); }}
                                  className="flex-1 px-2 py-1 bg-input border border-sidebar-border rounded-md text-muted-foreground text-[10px] cursor-pointer flex items-center justify-center gap-1">
                                  <span className="text-[12px]">↓</span>
                                  <span className="text-[8px] tracking-wider">TURUN</span>
                                </button>

                                {/* isAdmin toggle — accessible to everyone */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleAdmin(m.id); }}
                                  className="flex-1 px-2 py-1 rounded-md text-[10px] cursor-pointer flex items-center justify-center gap-1"
                                  style={{
                                    background: m.isAdmin ? "rgba(234,179,8,0.1)" : "var(--color-input)",
                                    border: m.isAdmin ? "1px solid rgba(234,179,8,0.35)" : "1px solid var(--color-sidebar-border)",
                                    color: m.isAdmin ? "var(--assign-admin-fg)" : "var(--color-muted-foreground)",
                                  }}>
                                  <span className="text-[11px]">{m.isAdmin ? "👑" : "👤"}</span>
                                  <span className="text-[8px] tracking-wider">{m.isAdmin ? "ADMIN" : "USER"}</span>
                                </button>

                                <button
                                  onClick={(e) => { e.stopPropagation(); removeMember(m.id); }}
                                  className="flex-1 px-2 py-1 bg-card rounded-md text-[10px] cursor-pointer flex items-center justify-center gap-1"
                                  style={{ color:"var(--assign-fail)", border:"1px solid rgba(127,29,29,0.33)" }}>
                                  <span className="text-[12px]">×</span>
                                  <span className="text-[8px] tracking-wider">HAPUS</span>
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
                  const sr = events[activeEvt].sr;
                  const pickerOpen = srPicker && srPicker.ei === activeEvt;

                  return (
                    <div className="border-t border-sidebar-border flex-shrink-0">
                      <div className="px-3 pt-2 pb-1 bg-sidebar">
                        <span className="text-[7.5px] text-muted-foreground tracking-wider font-mono">
                          PERAN KHUSUS — {EVT_NAMES[activeEvt].toUpperCase()}
                        </span>
                      </div>

                      <div className="p-2 bg-sidebar flex flex-col gap-2">
                        {SR_KEYS.map((key, ki) => {
                          const assigned = sr[key];
                          const aColor = assigned ? colorOf(assigned) : null;
                          const isOpen = !!(pickerOpen && srPicker.role === key);
                          const eligible = getSREligible(activeEvt, key);

                          return (
                            <Popover key={key} open={isOpen}
                              onOpenChange={(v) => setSRPicker(v ? { ei: activeEvt, role: key } : null)}>
                              <PopoverTrigger>
                                <div role="button"
                                  className={`w-full flex items-center gap-3 p-2 rounded-md border ${isOpen ? "bg-input border-sidebar-border" : "bg-transparent border-transparent"}`}>
                                  {aColor
                                    ? <span className="w-2.5 h-2.5 rounded-full" style={{ background:aColor, boxShadow:`0 0 6px ${aColor}66` }} />
                                    : <span className="w-2.5 h-2.5 rounded-full border border-dashed border-sidebar-border bg-transparent" />}
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="text-[7.5px] text-muted-foreground font-mono">{SR_SHORT[ki]}</div>
                                    <div className={`text-sm font-semibold mt-0.5 ${aColor ? "" : "text-muted-foreground"}`}>
                                      {assigned || <span className="text-[8px] text-muted-foreground italic">belum di-assign</span>}
                                    </div>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
                                </div>
                              </PopoverTrigger>

                              <PopoverContent className="w-full p-0">
                                <div className="bg-popover border border-sidebar-border rounded-b-md max-h-[140px] overflow-y-auto">
                                  <div
                                    onClick={() => setEventSR(activeEvt, key, null)}
                                    className="px-3 py-2 text-sm text-muted-foreground hover:bg-input cursor-pointer border-b border-sidebar-border">
                                    — Kosongkan slot ini
                                  </div>
                                  {eligible.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">Tidak ada anggota tersedia</div>
                                  ) : (
                                    eligible.map((mb) => (
                                      <div
                                        key={mb.id}
                                        onClick={() => setEventSR(activeEvt, key, mb.name)}
                                        className={`px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-input ${assigned === mb.name ? "bg-input" : ""}`}>
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ background:mb.color, boxShadow:`0 0 6px ${mb.color}66` }} />
                                        <span className="text-sm font-semibold text-muted-foreground">{mb.name}</span>
                                        {assigned === mb.name && <span className="ml-auto text-[8px] text-green-400">✓ terpilih</span>}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Bottom controls */}
                <div style={{ padding:"10px", borderTop:"1px solid var(--color-sidebar-border)" }}>
                  {error && (
                    <div style={{ background:"var(--assign-error-bg)", border:"1px solid var(--assign-error-border)", borderRadius:"6px", padding:"8px", fontSize:"9px", color:"var(--assign-error-text)", marginBottom:"8px", lineHeight:1.6, fontFamily:"DM Mono,monospace" }}>
                      ⚠ {error}
                    </div>
                  )}

                  {mode === "manual" && isReady && (
                    <div style={{ background:"var(--assign-manual-bg)", border:"1px solid var(--assign-manual-border)", borderRadius:"6px", padding:"8px", fontSize:"9px", color:"var(--assign-manual-text)", marginBottom:"8px", lineHeight:1.7, fontFamily:"DM Mono,monospace" }}>
                      {selected ? (
                        <>
                          <span style={{ color:"var(--assign-manual-accent)" }}>MEMILIH: </span>
                          <strong style={{ color:selected.color }}>{selected.name.toUpperCase()}</strong>
                          <br />Klik blok di peta untuk assign/unassign
                        </>
                      ) : "Klik nama counter untuk mulai assign manual"}
                    </div>
                  )}

                  {!isReady ? (
                    <Button onClick={initialize} className="w-full" size="lg">🚀 INITIALIZE EVENTS</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={initialize}>🎲 RE-ROLL SR</Button>
                      <Button variant="outline" className="flex-1" onClick={clearAll}>🗑 CLEAR</Button>
                    </div>
                  )}
                </div>
              </aside>

              {/* ════ MAIN AREA ════ */}
              <main className="flex-1 flex flex-col overflow-hidden min-h-0">
                {isReady && (
                  <div className="p-4 flex-1 overflow-auto">
                    <div className="bg-card rounded-md p-4 h-full">
                      <svg viewBox="0 0 830 500" width="100%" height="100%"
                        xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                        <ellipse cx="415" cy="54" rx="240" ry="70" fill="url(#stageGlow)" />

                        {A_BL.map((key) => {
                          const g         = GEOM[key];
                          const assignees = getAssignees(key, activeEvt);
                          const col       = assignees.length > 0 ? colorOf(assignees[0]) + "33" : "var(--color-sidebar-border)";
                          return (
                            <line key={key}
                              x1={g.cx} y1={g.cy - 28} x2="415" y2="96"
                              stroke={col} strokeWidth="1" strokeDasharray="6,5" opacity="0.7" />
                          );
                        })}

                        {Object.keys(GEOM).map((key) => renderBlock(key))}
                        {renderTooltip()}

                        <text x="824" y="486" textAnchor="end"
                          fill="var(--color-sidebar-foreground)" fontSize="8"
                          style={{ fontFamily:"DM Mono,monospace" }}>
                          bobot blok: {EVT_NAMES[activeEvt]}
                        </text>
                      </svg>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </CardContent>

          {showOut && isReady && (
            <CardFooter className="flex flex-col h-[215px] border-t border-sidebar-border p-0 bg-card">
              <div className="flex items-center justify-between px-4 py-2 border-b border-sidebar-border">
                <span className="text-[9px] font-semibold text-muted-foreground font-mono">OUTPUT TEKS</span>
                <div className="flex items-center gap-2">
                  <Button onClick={() => copyOut("TEEN")} variant={copied === "TEEN" ? "default" : "outline"} size="sm">
                    {copied === "TEEN" ? "✓ DISALIN" : "SALIN TEEN"}
                  </Button>
                  <Button onClick={() => copyOut("YOUTH")} variant={copied === "YOUTH" ? "default" : "outline"} size="sm">
                    {copied === "YOUTH" ? "✓ DISALIN" : "SALIN YOUTH"}
                  </Button>
                  <Button onClick={() => copyOut("ALL")} variant={copied === "ALL" ? "default" : "outline"} size="sm">
                    {copied === "ALL" ? "✓ DISALIN" : "SALIN SEMUA"}
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <pre className="text-[11px] text-muted-foreground leading-7 font-mono whitespace-pre-wrap m-0">
                  {genOutput()}
                </pre>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}