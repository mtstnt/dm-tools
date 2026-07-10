import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

export interface Member {
  id: string;
  name: string;
  nickname?: string;
  team?: string;
  role?: "Member" | "SPV" | "PIC";
  email?: string;
}

export const memberKeys = {
  all: ["members"] as const,
};

/**
 * Fetch every member from the `members` collection.
 * Used anywhere a person-picker is needed (Doa Wilayah PIC/TC1/TC2, etc).
 */
export async function fetchMembers(): Promise<Member[]> {
  const snap = await getDocs(collection(db, "members"));
  const out: Member[] = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      name: (data.name as string) ?? "(tanpa nama)",
      nickname: (data.nickname as string) ?? undefined,
      team: (data.team as string) ?? undefined,
      role: (data.role as Member["role"]) ?? "Member",
      email: (data.email as string) ?? undefined,
    };
  });
  out.sort((a, b) => a.name.localeCompare(b.name, "id"));
  return out;
}
