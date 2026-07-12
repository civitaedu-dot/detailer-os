import type { ParsedRow } from "./parsers";

export interface MatchCandidate {
  entry_type: "financial_entry" | "appointment" | "fixed_cost" | "variable_cost";
  entry_id: string;
  description: string;
  date: string;
  value: number;
  direction: "in" | "out";
}

export interface ReconcileOutcome {
  status: "matched" | "needs_review" | "divergent" | "pending";
  matched_entry_type?: MatchCandidate["entry_type"];
  matched_entry_id?: string;
  suggested_match?: MatchCandidate;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const A = normalize(a);
  const B = normalize(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const wordsA = new Set(A.split(" "));
  const wordsB = new Set(B.split(" "));
  let common = 0;
  wordsA.forEach((w) => wordsB.has(w) && common++);
  return common / Math.max(wordsA.size, wordsB.size);
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.abs(Math.round((da - db) / (1000 * 60 * 60 * 24)));
}

export function reconcileRow(row: ParsedRow, candidates: MatchCandidate[]): ReconcileOutcome {
  const sameDir = candidates.filter((c) => c.direction === row.direction);

  // 1. Exact value + date ±3 days
  const exact = sameDir
    .filter((c) => Math.abs(c.value - row.value) < 0.01 && daysDiff(c.date, row.date) <= 3)
    .sort((a, b) => daysDiff(a.date, row.date) - daysDiff(b.date, row.date));
  if (exact.length > 0) {
    return {
      status: "matched",
      matched_entry_type: exact[0].entry_type,
      matched_entry_id: exact[0].entry_id,
      suggested_match: exact[0],
    };
  }

  // 2. Exact value ±7 days with decent description similarity
  const close = sameDir
    .filter((c) => Math.abs(c.value - row.value) < 0.01 && daysDiff(c.date, row.date) <= 7)
    .map((c) => ({ c, sim: similarity(c.description, row.description) }))
    .filter((x) => x.sim > 0.2)
    .sort((a, b) => b.sim - a.sim);
  if (close.length > 0) {
    return { status: "needs_review", suggested_match: close[0].c };
  }

  // 3. Same day + similar description but different value
  const sameDay = sameDir
    .filter((c) => daysDiff(c.date, row.date) === 0)
    .map((c) => ({ c, sim: similarity(c.description, row.description) }))
    .filter((x) => x.sim > 0.5)
    .sort((a, b) => b.sim - a.sim);
  if (sameDay.length > 0) {
    return { status: "divergent", suggested_match: sameDay[0].c };
  }

  return { status: "pending" };
}