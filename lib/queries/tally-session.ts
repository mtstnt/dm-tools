import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  increment,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

export const TALLY_SESSION_COLLECTION = "tallySession";

export type TallySessionKind = "altarcall" | "tc";

export const TC_IN_LABEL = "TC In";
export const TC_OUT_LABEL = "TC Out";
export const TC_LABELS = [TC_IN_LABEL, TC_OUT_LABEL] as const;

export interface TallyLogEntry {
  id: string;
  delta: number;
  isCombo: boolean;
  altarCall: string;
  timestampMs: number;
}

export interface TallySessionDoc {
  serviceType?: string;
  date?: string;
  altarCallCount?: number;
  kind?: TallySessionKind;
  counts?: Record<string, number>;
}

export interface TallySessionSummary {
  id: string;
  serviceType: string;
  date: string;
  altarCallCount: number;
  kind: TallySessionKind;
  updatedAtMs: number | null;
}

export function tcTotals(counts: Record<string, number> | undefined | null) {
  const tcIn = Math.max(0, counts?.[TC_IN_LABEL] ?? 0);
  const tcOutRaw = counts?.[TC_OUT_LABEL] ?? 0;
  const tcOut = Math.max(0, -tcOutRaw);
  return { tcIn, tcOut, total: tcIn - tcOut };
}

export function buildSessionId(serviceType: string, date: string): string {
  const slug = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "x";
  return `${slug(serviceType)}__${slug(date)}`;
}

export function getTallySessionRef(sessionId: string) {
  return doc(db, TALLY_SESSION_COLLECTION, sessionId);
}

export function subscribeToTallySession(
  sessionId: string,
  onData: (data: TallySessionDoc | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    getTallySessionRef(sessionId),
    (snap) => onData(snap.exists() ? (snap.data() as TallySessionDoc) : null),
    (err) => onError?.(err)
  );
}

export async function fetchTallySession(
  sessionId: string
): Promise<TallySessionDoc | null> {
  const snap = await getDoc(getTallySessionRef(sessionId));
  return snap.exists() ? (snap.data() as TallySessionDoc) : null;
}

export async function listTallySessions(): Promise<TallySessionSummary[]> {
  const snap = await getDocs(collection(db, TALLY_SESSION_COLLECTION));
  const out: TallySessionSummary[] = [];

  snap.forEach((d) => {
    const data = d.data() as TallySessionDoc & {
      updatedAt?: { toMillis?: () => number };
    };
    out.push({
      id: d.id,
      serviceType: data.serviceType ?? "(tanpa nama)",
      date: data.date ?? "",
      altarCallCount: Math.max(data.altarCallCount ?? 1, 1),
      kind: data.kind ?? "altarcall",
      updatedAtMs: data.updatedAt?.toMillis?.() ?? null,
    });
  });

  out.sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
  return out;
}

export async function syncTallySessionMeta(meta: {
  serviceType: string;
  date: string;
  altarCallCount: number;
  kind?: TallySessionKind;
}): Promise<string> {
  const sessionId = buildSessionId(meta.serviceType, meta.date);

  await setDoc(
    getTallySessionRef(sessionId),
    {
      serviceType: meta.serviceType,
      date: meta.date,
      altarCallCount: Math.max(meta.altarCallCount, 1),
      kind: meta.kind ?? "altarcall",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return sessionId;
}

export async function ensureDoaWilayahTallySession(opts: {
  sessionId: string;
  label: string;
  date: string;
}): Promise<string> {
  await setDoc(
    getTallySessionRef(opts.sessionId),
    {
      serviceType: opts.label,
      date: opts.date,
      altarCallCount: 1,
      kind: "tc" as TallySessionKind,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return opts.sessionId;
}

export async function pushTallyDelta(
  sessionId: string,
  label: string,
  delta: number,
  isCombo: boolean
): Promise<TallyLogEntry> {
  const entry: TallyLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    delta,
    isCombo,
    altarCall: label,
    timestampMs: Date.now(),
  };

  // logs are intentionally NOT written to Firestore — local only
  await setDoc(
    getTallySessionRef(sessionId),
    {
      [`counts.${label}`]: increment(delta),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return entry;
}
