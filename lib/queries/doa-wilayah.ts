import {
  collection,
  doc,
  getDocs,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

export const DOA_WILAYAH_COLLECTION = "doaWilayah";

/**
 * Subcollection under each year document. Instead of packing all 12 months
 * into one map field on the year doc, every month gets its OWN document at
 * `doaWilayah/{year}/bulan/{month}`. That makes "which months are filled"
 * something you check by listing documents in this subcollection, instead
 * of loading the whole year doc and picking apart a nested map — and it's
 * what guarantees a month can only ever have one record (see
 * `getMonthDocRef` / `updateDoaWilayahMonth`).
 */
export const BULAN_COLLECTION = "bulan";

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
   * one document per month (12 per year, inside `BULAN_COLLECTION`), and
   * saving always merges over whatever was there before (see
   * `updateDoaWilayahMonth`).
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
 * `doaWilayah/{year}/bulan` — one document per month, doc id "1".."12".
 */
export function getBulanCollectionRef(year: number) {
  return collection(db, DOA_WILAYAH_COLLECTION, String(year), BULAN_COLLECTION);
}

/**
 * `doaWilayah/{year}/bulan/{month}` — the single, canonical document for one
 * month's Doa Wilayah. The doc id IS the month key, so every write for a
 * given month always lands on this exact same document — structurally,
 * there is no way for one month to end up with two documents.
 */
export function getMonthDocRef(year: number, month: number) {
  return doc(getBulanCollectionRef(year), monthKey(month));
}

/**
 * Stable, deterministic tally session id for a specific Doa Wilayah date.
 * Because the date string already encodes year+month+day, this is unique
 * per prayer date without needing extra arguments.
 */
export function buildDoaWilayahSessionId(dateStr: string) {
  return `doa-wilayah__${dateStr}`;
}

function monthsFromSnapshot(snap: QuerySnapshot): Record<string, DoaWilayahMonth> {
  const months: Record<string, DoaWilayahMonth> = {};
  snap.forEach((d) => {
    months[d.id] = d.data() as DoaWilayahMonth;
  });
  return months;
}

/**
 * Live-subscribes to every month document under a year, at once — fires
 * again whenever any single month is added, edited, or (in principle)
 * removed. This replaces subscribing to the year doc directly, since the
 * months now live in the `bulan` subcollection rather than in a field on
 * the year doc itself.
 */
export function subscribeDoaWilayahYear(
  year: number,
  onData: (data: DoaWilayahYearDoc) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    getBulanCollectionRef(year),
    (snap: QuerySnapshot) => {
      onData({ year, months: monthsFromSnapshot(snap) });
    },
    (err: Error) => onError?.(err)
  );
}

export async function fetchDoaWilayahYear(year: number): Promise<DoaWilayahYearDoc> {
  const snap = await getDocs(getBulanCollectionRef(year));
  return { year, months: monthsFromSnapshot(snap) };
}

/**
 * Partial update (merge) of a single month's fields.
 *
 * A month only ever has ONE Doa Wilayah record — one document at
 * `doaWilayah/{year}/bulan/{month}` (see `getMonthDocRef`), never a list of
 * entries. Because the document id IS the month itself, this call always
 * targets that same document: the first save creates it, every save after
 * that merges into it — a month can never end up with more than one
 * document. Each field passed in `patch` REPLACES whatever was saved before
 * at that exact field, so new data updates the old data, it never piles up.
 * Re-assigning PIC/TC1/TC2, editing notes, or changing the date all work by
 * calling this with just the field(s) that changed; the rest of the month
 * document is left untouched.
 */
export async function updateDoaWilayahMonth(
  year: number,
  month: number,
  patch: Partial<DoaWilayahMonth>
): Promise<void> {
  const fieldPatch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(patch)) {
    fieldPatch[k] = v === undefined ? null : v;
  }

  // Keep the year doc itself as a real document with its own field data —
  // not just an implicit parent path that only exists because `bulan` hangs
  // off of it. A Firestore doc with a subcollection but no fields of its own
  // won't show up if `doaWilayah` is ever listed/queried at the top level,
  // so this keeps the year doc "real" and browsable on its own.
  await setDoc(getYearDocRef(year), { year, updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(getMonthDocRef(year, month), fieldPatch, { merge: true });
}
