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
  /**
   * The Doa Wilayah date for this month — "YYYY-MM-DD". A month always has
   * exactly one Doa Wilayah, so this is a single field, not a list: there is
   * one record per month (12 per year), and saving always PUTs over
   * whatever was there before (see `updateDoaWilayahMonth`).
   */
  date?: string;
  /**
   * TC tally session tied to `date`. Set once via "Buka TC" — after that,
   * both the date field and the "Buka TC" button lock, because a month can
   * only ever have this one, fixed TC session.
   */
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

/**
 * Stable, deterministic tally session id for a specific Doa Wilayah date.
 * Because the date string already encodes year+month+day, this is unique
 * per prayer date without needing extra arguments.
 */
export function buildDoaWilayahSessionId(dateStr: string) {
  return `doa-wilayah__${dateStr}`;
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

/**
 * Partial update of a single month's fields (merge, dot-path safe).
 *
 * A month only ever has ONE Doa Wilayah record. Every call here writes into
 * `months.{month}.*` on the same year document, and each field passed in
 * `patch` REPLACES whatever was saved before at that exact path — i.e. this
 * is a PUT per field, not an append. Re-assigning PIC/TC1/TC2, editing
 * notes, or changing the date all work by calling this with just the
 * field(s) that changed; the rest of the month document is left untouched.
 */
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