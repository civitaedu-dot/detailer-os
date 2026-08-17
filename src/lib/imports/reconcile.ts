import type { ParsedRow } from "./parsers";
import { stripAccents } from "./parsers";

export type EntryType = "financial_entry" | "appointment" | "fixed_cost" | "variable_cost";

export interface MatchCandidate {
  entry_type: EntryType;
  entry_id: string;
  description: string;
  date: string;
  value: number;
  direction: "in" | "out";
  client_name?: string | null;
  payment_method?: string | null;
  category?: string | null;
  /** custos recorrentes não têm data exata — a data é apenas uma referência do período */
  flexible_date?: boolean;
}

export type ReconStatus = "matched" | "needs_review" | "divergent" | "pending";
export type MatchKind = "exact" | "strong" | "probable" | "weak" | "none";

export interface ReconcileOutcome {
  status: ReconStatus;
  matched_entry_type?: EntryType;
  matched_entry_id?: string;
  suggested_match?: MatchCandidate & { confidence: number; reasons: string[] };
  confidence: number;
  kind: MatchKind;
}

function normalize(s: string): string {
  return stripAccents(String(s || "").toLowerCase())
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "pix","ted","doc","transferencia","transf","pagamento","pagto","compra","debito","credito",
  "cartao","recebido","enviado","de","para","em","do","da","dos","das","ltda","me","sa","eireli",
]);

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((w) => w.length >= 3 && !STOP.has(w)));
}

/** Similaridade de descrição 0..1 combinando tokens e substring. */
export function descriptionSimilarity(a: string, b: string): number {
  const A = normalize(a);
  const B = normalize(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  ta.forEach((w) => { if (tb.has(w)) common++; });
  const jaccard = common / (ta.size + tb.size - common);
  let sub = 0;
  ta.forEach((w) => { if (w.length >= 4 && B.includes(w)) sub = Math.max(sub, 0.5); });
  tb.forEach((w) => { if (w.length >= 4 && A.includes(w)) sub = Math.max(sub, 0.5); });
  return Math.max(jaccard, sub);
}

export function daysDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.abs(Math.round((da - db) / 86400000));
}

interface Scored {
  candidate: MatchCandidate;
  score: number;
  reasons: string[];
  valueExact: boolean;
}

/**
 * Pontuação multicritério (0..100):
 *  - valor idêntico: 50 | diferença <= 1%: 30 | <= 5%: 15
 *  - data: mesmo dia 25 | ±1-2 dias 20 | ±3-5 dias 12 | ±6-10 dias 6
 *  - descrição: até 20 pontos proporcional à similaridade
 *  - nome do cliente presente na descrição: +10
 *  - meio de pagamento coerente: +5
 */
function scoreCandidate(row: ParsedRow, c: MatchCandidate): Scored | null {
  if (c.direction !== row.direction) return null;

  const reasons: string[] = [];
  let score = 0;

  const diff = Math.abs(c.value - row.value);
  const rel = row.value > 0 ? diff / row.value : 1;
  const valueExact = diff < 0.005;
  if (valueExact) { score += 50; reasons.push("valor idêntico"); }
  else if (rel <= 0.01) { score += 30; reasons.push("valor quase idêntico"); }
  else if (rel <= 0.05) { score += 15; reasons.push("valor próximo"); }
  else return null; // diferença acima de 5% não é candidato

  const dd = c.flexible_date ? 0 : daysDiff(c.date, row.date);
  if (c.flexible_date) { score += 8; reasons.push("custo recorrente do período"); }
  else if (dd === 0) { score += 25; reasons.push("mesma data"); }
  else if (dd <= 2) { score += 20; reasons.push(`${dd} dia(s) de diferença`); }
  else if (dd <= 5) { score += 12; reasons.push(`${dd} dias de diferença`); }
  else if (dd <= 10) { score += 6; reasons.push(`${dd} dias de diferença`); }
  else return null;

  const sim = descriptionSimilarity(c.description, row.description);
  if (sim > 0) { score += Math.round(sim * 20); if (sim >= 0.4) reasons.push("descrição semelhante"); }

  if (c.client_name) {
    const cn = normalize(c.client_name);
    if (cn.length >= 4 && normalize(row.description).includes(cn.split(" ")[0])) {
      score += 10;
      reasons.push("nome do cliente na descrição");
    }
  }

  if (c.payment_method) {
    const pm = normalize(c.payment_method);
    if (pm && normalize(row.description).includes(pm)) { score += 5; reasons.push("meio de pagamento coerente"); }
  }

  return { candidate: c, score: Math.min(score, 100), reasons, valueExact };
}

/**
 * Conciliação conservadora: só marca como conciliado automaticamente quando
 * há valor idêntico, data muito próxima e nenhum outro candidato igualmente forte.
 */
export function reconcileRow(row: ParsedRow, candidates: MatchCandidate[]): ReconcileOutcome {
  const scored = candidates
    .map((c) => scoreCandidate(row, c))
    .filter((x): x is Scored => x !== null)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { status: "pending", confidence: 0, kind: "none" };

  const best = scored[0];
  const runnerUp = scored[1];
  const ambiguous = !!runnerUp && best.score - runnerUp.score < 8;

  const suggestion = { ...best.candidate, confidence: best.score, reasons: best.reasons };

  // Conciliação automática: exige valor exato, data próxima, score alto e ausência de empate
  if (best.valueExact && best.score >= 80 && !ambiguous) {
    return {
      status: "matched",
      matched_entry_type: best.candidate.entry_type,
      matched_entry_id: best.candidate.entry_id,
      suggested_match: suggestion,
      confidence: best.score,
      kind: "exact",
    };
  }

  if (best.score >= 60) {
    return {
      status: "needs_review",
      suggested_match: suggestion,
      confidence: best.score,
      kind: ambiguous ? "probable" : "strong",
    };
  }

  if (best.score >= 40) {
    // valor diferente mas data/descrição batem => possível divergência de valor
    if (!best.valueExact) {
      return { status: "divergent", suggested_match: suggestion, confidence: best.score, kind: "probable" };
    }
    return { status: "needs_review", suggested_match: suggestion, confidence: best.score, kind: "probable" };
  }

  return { status: "pending", suggested_match: suggestion, confidence: best.score, kind: "weak" };
}
