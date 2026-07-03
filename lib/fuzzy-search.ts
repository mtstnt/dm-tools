/**
 * Generic fuzzy name search — ported from the search bar in
 * app/tools/assign/page.tsx so the same "search by name or nickname,
 * tolerate typos" behavior is available anywhere a person-picker is needed
 * (e.g. Doa Wilayah PIC/TC1/TC2), without duplicating the algorithm.
 */

const levenshtein = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
};

const fuzzySim = (a: string, b: string): number => {
  if (!a || !b) return 0;
  const max = Math.max(a.length, b.length);
  return max ? 1 - levenshtein(a, b) / max : 1;
};

const fuzzyBestWord = (kw: string, text: string): number => {
  let best = 0;
  for (const w of text.split(/\s+/)) best = Math.max(best, fuzzySim(kw, w));
  return best;
};

const PREFIXES = new Set([
  "ko", "ce", "bro", "sis", "kak", "om", "tante", "pak", "bu", "bang", "abang", "koko", "cece", "sis.",
]);

export const normalizeName = (line: string): string => {
  const words = line.toLowerCase().trim().split(/\s+/);
  return words.filter((w) => !PREFIXES.has(w)).join(" ").trim();
};

export interface FuzzyNameEntry {
  name: string;
  nickname?: string;
}

const scoreEntry = (kw: string, entry: FuzzyNameEntry): number => {
  const q    = kw.toLowerCase().trim();
  const nick = (entry.nickname ?? "").toLowerCase();
  const full = entry.name.toLowerCase();

  let exactNick = 0, nickHas = 0, fullHas = 0;
  if (nick && q === nick) exactNick = 100;
  else if (nick && nick.includes(q)) nickHas = 70;
  if (full.includes(q)) fullHas = 50;

  const fuzzyNick = nick ? fuzzySim(q, nick) * 50 : 0;
  const fuzzyFull = fuzzyBestWord(q, full) * 30;
  return exactNick + nickHas + fullHas + fuzzyNick + fuzzyFull;
};

/** Ranks `entries` against `keyword` by name/nickname similarity (typo-tolerant), best match first. */
export function rankByFuzzyName<T extends FuzzyNameEntry>(
  keyword: string,
  entries: T[],
  limit = 8
): T[] {
  const q = normalizeName(keyword);
  if (!q) return [];
  return entries
    .map((e) => ({ e, score: scoreEntry(q, e) }))
    .filter((r) => r.score > 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.e);
}