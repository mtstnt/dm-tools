import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

export interface Report {
  id: string;
  altarcallNumber?: string;
  altarcallText?: string;
  baptisan?: string;
  bersediaJoinCg?: string;
  date?: string;
  divisions?: Record<string, number>;
  eventName?: string;
  guest?: string;
  jemaat?: string;
  lastUpdated?: string;
  oneMinutePrayer?: string;
  pastorSpeaker?: string;
  prayerStation?: string;
  reportText?: string;
  tc?: string;
  title?: string;
  totalVolunteer?: number;
  type?: string;
  whl?: string;
}

export const reportKeys = {
  all: ["reports"] as const,
  lists: () => [...reportKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...reportKeys.lists(), filters] as const,
  details: () => [...reportKeys.all, "detail"] as const,
  detail: (id: string) => [...reportKeys.details(), id] as const,
};

function parseDate(dateStr: string): number {
  const monthMap: Record<string, number> = {
    Januari: 0,
    Februari: 1,
    Maret: 2,
    April: 3,
    Mei: 4,
    Juni: 5,
    Juli: 6,
    Agustus: 7,
    September: 8,
    Oktober: 9,
    November: 10,
    Desember: 11,
  };
  const parts = dateStr.split(" ");
  if (parts.length < 3) return 0;
  const day = parseInt(parts[0], 10);
  const month = monthMap[parts[1]] ?? 0;
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day).getTime();
}

export async function fetchReports(): Promise<Report[]> {
  const q = query(collection(db, "reports"), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  const reports = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Report[];

  return reports.sort((a, b) => {
    const dateA = parseDate(a.date ?? "");
    const dateB = parseDate(b.date ?? "");
    return dateB - dateA;
  });
}
