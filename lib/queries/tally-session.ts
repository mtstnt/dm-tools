// lib/queries/tally-session.ts
//
// Shared "temporary" Firestore document that powers the Tally Counter feature.
// Replaces the earlier localStorage-based approach so the session (service
// type, date, altar call count) and the live counts/log are visible to every
// user/device in real time — not just the browser that wrote them.
//
// Collection: tallySession  ·  Doc ID: "current"
//
// Written by:
//   - app/tools/reports/page.tsx  → syncTallySessionMeta()   (serviceType, date, altarCallCount)
//   - app/tools/tally/page.tsx    → pushTallyDelta()         (counts, logs)
//
// Read by:
//   - app/tools/tally/page.tsx    → subscribeToTallySession() / fetchTallySession()
//
// NOTE: Firestore security rules must allow authenticated read/write on this
// collection, e.g.:
//
//   match /tallySession/{sessionId} {
//     allow read, write: if request.auth != null;
//   }

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

/**
 * Real-time subscription — fires immediately with current data, then again
 * on every change from any user/device. Returns the unsubscribe function;
 * call it in a useEffect cleanup.
 */
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

/**
 * Call from the Reports page on mount, and whenever service type, date, or
 * altar call count changes.
 *
 * If the service type or date actually changed since the last sync, this
 * starts a FRESH session — counts and log are reset to empty, since a new
 * service occurrence has started. If it's the same occurrence (e.g. the
 * page was just reopened, or only the altar call count changed), existing
 * tally counts/log are left untouched.
 */
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

/**
 * Call from the Tally page on every committed +/- action (i.e. after a
 * combo settles, or immediately for a single decrement). Uses an atomic
 * Firestore increment so concurrent taps from multiple devices on the same
 * altar call never race or overwrite each other.
 */
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