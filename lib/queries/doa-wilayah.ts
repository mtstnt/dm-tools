import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DOA_WILAYAH_COLLECTION = "doaWilayah";

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

export interface MonthPerson {
  id: string;
  name: string;
}

export interface DoaWilayahMonth {
  pic?: MonthPerson | null;
  tc1?: MonthPerson | null;
  tc2?: MonthPerson | null;
  notes?: string;
  /** Linked tools/tally session id (kind: "tc") for this month, if opened. */
  tallySessionId?: string;
}

export interface DoaWilayahYearDoc {
  year: number;
  months: Record<string, DoaWilayahMonth>; // key: "1".."12"
}

export function getYearDocRef(year: number) {
  return doc(db, DOA_WILAYAH_COLLECTION, String(year));
}

export function monthKey(month: number) {
  return String(month); // 1-12
}

/** Stable, deterministic tally session id for a given year+month. */
export function buildDoaWilayahSessionId(year: number, month: number) {
  return `doa-wilayah__${year}-${String(month).padStart(2, "0")}`;
}

export function subscribeDoaWilayahYear(
  year: number,
  onData: (data: DoaWilayahYearDoc) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    getYearDocRef(year),
    (snap: import("firebase/firestore").DocumentSnapshot) => {
      if (!snap.exists()) {
        onData({ year, months: {} });
        return;
      }
      const data = snap.data() as Partial<DoaWilayahYearDoc>;
      onData({ year, months: data.months ?? {} });
    },
    (err: Error) => onError?.(err)
  );
}

export async function fetchDoaWilayahYear(year: number): Promise<DoaWilayahYearDoc> {
  const snap = await getDoc(getYearDocRef(year));
  if (!snap.exists()) return { year, months: {} };
  const data = snap.data() as Partial<DoaWilayahYearDoc>;
  return { year, months: data.months ?? {} };
}

/** Partial update of a single month's fields (merge, dot-path safe). */
export async function updateDoaWilayahMonth(
  year: number,
  month: number,
  patch: Partial<DoaWilayahMonth>
): Promise<void> {
  const key = monthKey(month);
  const fieldPatch: Record<string, unknown> = { year, updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(patch)) {
    fieldPatch[`months.${key}.${k}`] = v === undefined ? null : v;
  }
  await setDoc(getYearDocRef(year), fieldPatch, { merge: true });
}