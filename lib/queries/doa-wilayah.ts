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

/**
 * A single Doa Wilayah prayer date scheduled within a month.
 * `tallySessionId` is only set once the TC tally session for THIS specific
 * date has been opened — after that, the "Buka TC" action for this date
 * is locked (see doa-wilayah/page.tsx).
 */
export interface DoaWilayahDate {
  date: string; // ISO date string "YYYY-MM-DD"
  tallySessionId?: string;
}

export interface DoaWilayahMonth {
  pic?: MonthPerson | null;
  tc1?: MonthPerson | null;
  tc2?: MonthPerson | null;
  notes?: string;
  /**
   * All Doa Wilayah dates scheduled for this month. A month can have more
   * than one prayer date, but the month itself always resolves to a single
   * Doa Wilayah record — saving replaces this array wholesale (see
   * `updateDoaWilayahMonth`), it never appends a second record for the
   * same month.
   */
  dates?: DoaWilayahDate[];
  /**
   * @deprecated legacy single-session id used before per-date TC sessions
   * existed. Kept only so older documents keep rendering; new writes
   * should use `dates[].tallySessionId` instead.
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