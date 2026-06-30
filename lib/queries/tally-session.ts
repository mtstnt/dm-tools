import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  increment,
  arrayUnion,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const TALLY_SESSION_COLLECTION = "tallySession";
export const TALLY_SESSION_DOC_ID = "current";

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
  counts?: Record<string, number>;
  logs?: TallyLogEntry[];
}

export function getTallySessionRef() {
  return doc(db, TALLY_SESSION_COLLECTION, TALLY_SESSION_DOC_ID);
}

export function subscribeToTallySession(
  onData: (data: TallySessionDoc | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    getTallySessionRef(),
    (snap) => onData(snap.exists() ? (snap.data() as TallySessionDoc) : null),
    (err) => onError?.(err)
  );
}

/** One-shot fetch — used by the manual Refresh button as a fallback to the live listener. */
export async function fetchTallySession(): Promise<TallySessionDoc | null> {
  const snap = await getDoc(getTallySessionRef());
  return snap.exists() ? (snap.data() as TallySessionDoc) : null;
}

export async function syncTallySessionMeta(meta: {
  serviceType: string;
  date: string;
  altarCallCount: number;
}): Promise<void> {
  const ref = getTallySessionRef();
  const prev = await fetchTallySession();
  const altarCallCount = Math.max(meta.altarCallCount, 1);
  const isNewOccurrence =
    !prev || prev.serviceType !== meta.serviceType || prev.date !== meta.date;

  if (isNewOccurrence) {
    await setDoc(ref, {
      serviceType: meta.serviceType,
      date: meta.date,
      altarCallCount,
      counts: {},
      logs: [],
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(
      ref,
      {
        serviceType: meta.serviceType,
        date: meta.date,
        altarCallCount,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function pushTallyDelta(
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

  await setDoc(
    getTallySessionRef(),
    {
      counts: { [label]: increment(delta) },
      logs: arrayUnion(entry),
    },
    { merge: true }
  );

  return entry;
}