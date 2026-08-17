import Papa from "papaparse";
import * as XLSX from "xlsx";

export type FileFormat = "csv" | "xlsx" | "ofx" | "pdf";

export interface ParsedRow {
  date: string; // YYYY-MM-DD (local, no timezone conversion)
  description: string; // normalized/cleaned description
  original_description: string; // exactly as it came from the file
  value: number; // always positive; direction carries the sign
  direction: "in" | "out";
  balance_after?: number | null;
  external_id?: string | null; // FITID / ID da transação quando disponível
  raw: Record<string, unknown>;
}

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  rawRows: Record<string, unknown>[];
  format: FileFormat;
  bankName?: string | null;
  mapping?: Partial<ColumnMapping>;
  warnings: string[];
  needsMapping: boolean;
}

export interface ColumnMapping {
  date: string;
  description: string;
  value: string;
  type?: string; // coluna que indica entrada/saída (D/C, tipo, etc.)
  debit?: string; // coluna separada de débitos
  credit?: string; // coluna separada de créditos
  balance?: string;
  externalId?: string;
}

/* ------------------------------------------------------------------ */
/* Normalização básica                                                 */
/* ------------------------------------------------------------------ */

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function norm(s: string): string {
  return stripAccents(String(s || "")).toLowerCase().replace(/\s+/g, " ").trim();
}

export function cleanDescription(s: string): string {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f]/g, "")
    .trim();
}

/**
 * Parser numérico tolerante a formatos BR e EN.
 * Preserva casas decimais e sinal (inclusive "1.234,56 D", "(123,45)", "-R$ 10,00", "10,00-").
 * Retorna { value, explicitSign } — explicitSign indica se o próprio texto informou D/C ou sinal.
 */
export function parseAmount(v: unknown): { value: number; sign: -1 | 1 | 0 } | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    if (!isFinite(v)) return null;
    return { value: Math.abs(v), sign: v < 0 ? -1 : 0 };
  }
  let s = String(v).trim();
  if (!s) return null;

  let sign: -1 | 1 | 0 = 0;

  // sufixo/prefixo D (débito) ou C (crédito)
  const dc = s.match(/(^|\s)([dc])(\s|$)/i);
  if (dc) {
    sign = dc[2].toLowerCase() === "d" ? -1 : 1;
    s = s.replace(/(^|\s)[dc](\s|$)/i, " ");
  }

  // parênteses = negativo
  if (/^\(.*\)$/.test(s.trim())) {
    sign = -1;
    s = s.replace(/[()]/g, "");
  }

  // sinal ao final ("10,00-")
  if (/-\s*$/.test(s)) {
    sign = -1;
    s = s.replace(/-\s*$/, "");
  }
  if (/\+\s*$/.test(s)) {
    if (sign === 0) sign = 1;
    s = s.replace(/\+\s*$/, "");
  }

  s = s.replace(/r\$/gi, "").replace(/brl/gi, "").replace(/\s|\u00a0/g, "");

  if (s.startsWith("-")) { sign = -1; s = s.slice(1); }
  else if (s.startsWith("+")) { if (sign === 0) sign = 1; s = s.slice(1); }

  if (!/[0-9]/.test(s)) return null;
  if (/[^0-9.,]/.test(s)) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // o último separador é o decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    const parts = s.split(",");
    // "1,234" com 3 dígitos após e mais de um grupo => milhar EN
    if (parts.length > 2) s = s.replace(/,/g, "");
    else if (parts[1].length === 3 && parts[0].length > 0 && /^\d{1,3}$/.test(parts[0]) === false) s = s.replace(/,/g, "");
    else s = s.replace(",", ".");
  } else if (hasDot) {
    const parts = s.split(".");
    // "1.234" ou "1.234.567" sem vírgula => separador de milhar BR
    if (parts.length > 2) s = s.replace(/\./g, "");
    else if (parts[1].length === 3) s = s.replace(/\./g, "");
  }

  const n = parseFloat(s);
  if (isNaN(n)) return null;
  // arredonda para 2 casas evitando erro de ponto flutuante
  return { value: Math.round(Math.abs(n) * 100) / 100, sign };
}

export function parseDateBR(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return toYMD(v);
  if (typeof v === "number") {
    // serial date do Excel
    if (v > 20000 && v < 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }
    return null;
  }
  const s = String(v).trim();
  if (!s) return null;

  // yyyy-mm-dd / yyyy/mm/dd
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return safeYMD(+iso[1], +iso[2], +iso[3]);

  // dd/mm/yyyy | dd-mm-yy | dd.mm.yyyy
  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (br) {
    let y = parseInt(br[3], 10);
    if (br[3].length === 2) y = y > 70 ? 1900 + y : 2000 + y;
    let d = parseInt(br[1], 10);
    let m = parseInt(br[2], 10);
    // se o "dia" > 12 é claramente dd/mm; se mês > 12 assume mm/dd (formato EN)
    if (m > 12 && d <= 12) { const t = d; d = m; m = t; }
    return safeYMD(y, m, d);
  }

  // OFX yyyymmdd
  const ofx = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) return safeYMD(+ofx[1], +ofx[2], +ofx[3]);

  // "12 jan 2025" / "12 de janeiro de 2025"
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const txt = norm(s).match(/(\d{1,2})\s*(?:de\s*)?([a-z]{3,})\.?\s*(?:de\s*)?(\d{2,4})/);
  if (txt) {
    const mi = months.indexOf(txt[2].slice(0, 3));
    if (mi >= 0) {
      let y = parseInt(txt[3], 10);
      if (txt[3].length === 2) y = 2000 + y;
      return safeYMD(y, mi + 1, parseInt(txt[1], 10));
    }
  }
  return null;
}

function safeYMD(y: number, m: number, d: number): string | null {
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
  if (y < 1990 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Detecção de estrutura                                               */
/* ------------------------------------------------------------------ */

const H = {
  date: [/^data/, /data.*(lanc|mov|opera|transa|compe|efet)/, /^dt/, /^date$/, /posting ?date/, /data$/],
  desc: [/descri/, /histor/, /^memo/, /detalh/, /lancamento/, /movimenta/, /narrativ/, /^titulo/, /estabelecimento/, /^name$/],
  value: [/^valor$/, /valor.*(r\$|brl|lanc|mov|transa)/, /^amount/, /^montante/, /^vlr/, /^valor/],
  credit: [/credito/, /entrada/, /^receita/, /deposito/, /^cred/],
  debit: [/debito/, /saida/, /^despesa/, /retirada/, /^deb/],
  type: [/^tipo/, /^type$/, /d\/c/, /natureza/, /^sinal/, /credito\/debito/, /debito\/credito/],
  balance: [/saldo/, /^balance/],
  extId: [/identificador/, /^id$/, /fitid/, /^documento/, /num.*doc/, /doc.*num/, /^nsu/, /autoriza/, /transaction ?id/],
};

function pick(headers: string[], patterns: RegExp[], used: Set<string>): string | undefined {
  const normalized = headers.map((h) => norm(h));
  for (const p of patterns) {
    for (let i = 0; i < headers.length; i++) {
      if (used.has(headers[i])) continue;
      if (p.test(normalized[i])) return headers[i];
    }
  }
  return undefined;
}

export function autoDetectMapping(
  headers: string[],
  sample: Record<string, unknown>[] = [],
): Partial<ColumnMapping> {
  const used = new Set<string>();
  const take = (k: keyof ColumnMapping, pats: RegExp[]) => {
    const h = pick(headers, pats, used);
    if (h) used.add(h);
    return h;
  };

  const date = take("date", H.date);
  const description = take("description", H.desc);
  const credit = take("credit", H.credit);
  const debit = take("debit", H.debit);
  const balance = take("balance", H.balance);
  const type = take("type", H.type);
  const value = take("value", H.value);
  const externalId = take("externalId", H.extId);

  const mapping: Partial<ColumnMapping> = { date, description, balance, type, externalId };

  // Se existirem colunas separadas de crédito e débito, elas têm prioridade
  if (credit && debit) {
    mapping.credit = credit;
    mapping.debit = debit;
    if (value) mapping.value = value;
  } else {
    mapping.value = value || credit || debit;
    if (!value && credit && !debit) mapping.credit = credit;
    if (!value && debit && !credit) mapping.debit = debit;
  }

  // Fallback por conteúdo quando cabeçalhos não são reconhecidos
  if (sample.length > 0) {
    if (!mapping.date) mapping.date = headers.find((h) => sample.some((r) => parseDateBR(r[h])));
    if (!mapping.value && !mapping.credit && !mapping.debit) {
      mapping.value = headers.find(
        (h) => h !== mapping.date && sample.filter((r) => parseAmount(r[h]) !== null).length > sample.length * 0.6,
      );
    }
    if (!mapping.description) {
      mapping.description = headers.find(
        (h) =>
          h !== mapping.date &&
          h !== mapping.value &&
          sample.some((r) => String(r[h] ?? "").trim().length > 4 && parseAmount(r[h]) === null),
      );
    }
  }

  return mapping;
}

function directionFromTypeCell(raw: string): "in" | "out" | null {
  const t = norm(raw);
  if (!t) return null;
  if (/^(d|deb|debito|saida|pagamento|despesa|debit|withdrawal|out)$/.test(t)) return "out";
  if (/^(c|cred|credito|entrada|recebimento|receita|credit|deposit|in)$/.test(t)) return "in";
  if (/\b(saida|debito|debit|pagamento|despesa|retirada)\b/.test(t)) return "out";
  if (/\b(entrada|credito|credit|recebimento|receita|deposito)\b/.test(t)) return "in";
  return null;
}

/** Palavras da descrição que indicam saída com alta segurança (usado só como último recurso). */
function directionFromDescription(desc: string): "in" | "out" | null {
  const d = norm(desc);
  if (/\b(pagamento efetuado|pix enviado|transferencia enviada|compra|tarifa|iof|debito automatico|saque|boleto pago|pagto)\b/.test(d)) return "out";
  if (/\b(pix recebido|transferencia recebida|deposito|credito recebido|recebimento|estorno|liquidacao)\b/.test(d)) return "in";
  return null;
}

/* ------------------------------------------------------------------ */
/* Aplicação do mapeamento                                             */
/* ------------------------------------------------------------------ */

export interface ApplyResult {
  rows: ParsedRow[];
  skipped: number;
  warnings: string[];
}

export function applyMapping(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMapping,
): ApplyResult {
  const rows: ParsedRow[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  let ambiguousDirection = 0;

  for (const row of rawRows) {
    const date = parseDateBR(row[mapping.date]);
    const originalDescription = String(row[mapping.description] ?? "").trim();
    const description = cleanDescription(originalDescription);

    let value: number | null = null;
    let direction: "in" | "out" | null = null;

    // 1) colunas separadas débito/crédito
    if (mapping.credit || mapping.debit) {
      const cred = mapping.credit ? parseAmount(row[mapping.credit]) : null;
      const deb = mapping.debit ? parseAmount(row[mapping.debit]) : null;
      if (cred && cred.value > 0) { value = cred.value; direction = "in"; }
      else if (deb && deb.value > 0) { value = deb.value; direction = "out"; }
    }

    // 2) coluna única de valor
    if (value === null && mapping.value) {
      const amt = parseAmount(row[mapping.value]);
      if (amt) {
        value = amt.value;
        if (amt.sign === -1) direction = "out";
        else if (amt.sign === 1) direction = "in";
      }
    }

    if (!date || value === null || value === 0 || !description) { skipped++; continue; }

    // 3) coluna de tipo tem prioridade sobre o sinal inferido
    if (mapping.type && row[mapping.type] !== undefined && row[mapping.type] !== "") {
      const d = directionFromTypeCell(String(row[mapping.type]));
      if (d) direction = d;
    }

    // 4) último recurso: pistas na descrição
    if (!direction) {
      const d = directionFromDescription(description);
      if (d) direction = d;
      else { direction = "in"; ambiguousDirection++; }
    }

    const balance = mapping.balance ? parseAmount(row[mapping.balance]) : null;
    const extId = mapping.externalId ? String(row[mapping.externalId] ?? "").trim() : "";

    rows.push({
      date,
      description,
      original_description: originalDescription,
      value,
      direction,
      balance_after: balance ? (balance.sign === -1 ? -balance.value : balance.value) : null,
      external_id: extId || null,
      raw: row,
    });
  }

  if (skipped > 0) warnings.push(`${skipped} linha(s) ignorada(s) por não conter data, descrição ou valor válidos.`);
  if (ambiguousDirection > 0)
    warnings.push(
      `${ambiguousDirection} movimentação(ões) sem indicação clara de entrada/saída foram marcadas como entrada. Confira antes de confirmar.`,
    );

  return { rows, skipped, warnings };
}

/* ------------------------------------------------------------------ */
/* Leitores por formato                                                */
/* ------------------------------------------------------------------ */

async function readTextSmart(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  // heurística: muitos caracteres de substituição => provavelmente latin1/windows-1252
  const bad = (text.match(/\uFFFD/g) || []).length;
  if (bad > text.length * 0.001) {
    text = new TextDecoder("windows-1252").decode(buf);
  }
  return text;
}

/** Detecta a linha de cabeçalho real, pulando preâmbulos de banco. */
function findHeaderRow(matrix: unknown[][]): number {
  const score = (r: unknown[]) => {
    const cells = r.map((c) => norm(String(c ?? "")));
    const filled = cells.filter((c) => c.length > 0).length;
    if (filled < 2) return -1;
    let s = 0;
    if (cells.some((c) => /data|date/.test(c))) s += 2;
    if (cells.some((c) => /descri|histor|memo|lancamento|detalh/.test(c))) s += 2;
    if (cells.some((c) => /valor|amount|credito|debito|entrada|saida/.test(c))) s += 2;
    if (cells.some((c) => /saldo|balance/.test(c))) s += 1;
    return s;
  };
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const s = score(matrix[i]);
    if (s > bestScore) { bestScore = s; best = i; }
  }
  return bestScore >= 4 ? best : 0;
}

function matrixToObjects(matrix: unknown[][], headerRow: number): { headers: string[]; rows: Record<string, unknown>[] } {
  const rawHeaders = (matrix[headerRow] || []).map((h, i) => {
    const s = cleanDescription(String(h ?? ""));
    return s || `Coluna ${i + 1}`;
  });
  // desambigua nomes repetidos
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h) => {
    const n = (seen.get(h) || 0) + 1;
    seen.set(h, n);
    return n > 1 ? `${h} (${n})` : h;
  });
  const rows: Record<string, unknown>[] = [];
  for (let i = headerRow + 1; i < matrix.length; i++) {
    const r = matrix[i] || [];
    if (r.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] ?? ""; });
    rows.push(obj);
  }
  return { headers, rows };
}

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 20).join("\n");
  const counts: Record<string, number> = {
    ";": (sample.match(/;/g) || []).length,
    ",": (sample.match(/,/g) || []).length,
    "\t": (sample.match(/\t/g) || []).length,
    "|": (sample.match(/\|/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ",";
}

function detectBankName(text: string): string | null {
  const t = norm(text.slice(0, 4000));
  const banks: Array<[RegExp, string]> = [
    [/nubank|nu pagamentos/, "Nubank"],
    [/itau|itaú/, "Itaú"],
    [/bradesco/, "Bradesco"],
    [/banco do brasil|\bbb\b/, "Banco do Brasil"],
    [/santander/, "Santander"],
    [/caixa economica|\bcef\b/, "Caixa"],
    [/inter\b/, "Banco Inter"],
    [/sicoob/, "Sicoob"],
    [/sicredi/, "Sicredi"],
    [/c6 ?bank/, "C6 Bank"],
    [/mercado ?pago/, "Mercado Pago"],
    [/pagseguro|pagbank/, "PagBank"],
    [/stone/, "Stone"],
    [/cielo/, "Cielo"],
    [/getnet/, "Getnet"],
    [/safra/, "Safra"],
    [/original/, "Banco Original"],
    [/banrisul/, "Banrisul"],
    [/\bbtg\b/, "BTG Pactual"],
  ];
  for (const [re, name] of banks) if (re.test(t)) return name;
  return null;
}

export async function parseCSVFile(file: File): Promise<ParseResult> {
  const text = await readTextSmart(file);
  const delimiter = detectDelimiter(text);
  const res = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: "greedy" });
  const matrix = (res.data as unknown[][]) || [];
  if (matrix.length === 0) throw new Error("Arquivo CSV vazio ou ilegível.");
  const headerRow = findHeaderRow(matrix);
  const { headers, rows } = matrixToObjects(matrix, headerRow);
  const mapping = autoDetectMapping(headers, rows.slice(0, 50));
  const warnings: string[] = [];
  if (headerRow > 0) warnings.push(`Cabeçalho identificado na linha ${headerRow + 1} (linhas anteriores foram tratadas como informações do banco).`);
  return {
    rows: [],
    headers,
    rawRows: rows,
    format: "csv",
    bankName: detectBankName(text),
    mapping,
    warnings,
    needsMapping: true,
  };
}

export async function parseXLSXFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true, raw: false });
  // escolhe a aba com mais linhas
  let best = wb.SheetNames[0];
  let bestLen = -1;
  for (const name of wb.SheetNames) {
    const m = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: "" });
    if (m.length > bestLen) { bestLen = m.length; best = name; }
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[best], { header: 1, defval: "", raw: false });
  if (matrix.length === 0) throw new Error("Planilha vazia.");
  const headerRow = findHeaderRow(matrix);
  const { headers, rows } = matrixToObjects(matrix, headerRow);
  const mapping = autoDetectMapping(headers, rows.slice(0, 50));
  const warnings: string[] = [];
  if (wb.SheetNames.length > 1) warnings.push(`A planilha tem ${wb.SheetNames.length} abas; usamos a aba "${best}" (a mais completa).`);
  if (headerRow > 0) warnings.push(`Cabeçalho identificado na linha ${headerRow + 1}.`);
  const flat = matrix.slice(0, 10).flat().join(" ");
  return {
    rows: [],
    headers,
    rawRows: rows,
    format: "xlsx",
    bankName: detectBankName(flat),
    mapping,
    warnings,
    needsMapping: true,
  };
}

export async function parseOFXFile(file: File): Promise<ParseResult> {
  const text = await readTextSmart(file);
  const rows: ParsedRow[] = [];
  const warnings: string[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];

  if (blocks.length === 0) throw new Error("Nenhuma transação encontrada no arquivo OFX.");

  const orgMatch = text.match(/<ORG>([^<\r\n]+)/i);
  const bankIdMatch = text.match(/<BANKID>([^<\r\n]+)/i);
  const bankName = (orgMatch ? cleanDescription(orgMatch[1]) : null) || detectBankName(text) || (bankIdMatch ? `Banco ${bankIdMatch[1].trim()}` : null);

  const ledgerMatch = text.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<\r\n]+)/i);
  const ledgerBal = ledgerMatch ? parseAmount(ledgerMatch[1]) : null;

  const seenFitIds = new Set<string>();
  let dupInFile = 0;

  for (const block of blocks) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
      return m ? m[1].trim() : "";
    };
    const dtRaw = get("DTPOSTED") || get("DTUSER") || get("DTAVAIL");
    const date = parseDateBR(dtRaw);
    const amt = parseAmount(get("TRNAMT"));
    const trntype = get("TRNTYPE");
    const memo = cleanDescription(get("MEMO") || get("NAME") || trntype);
    const fitid = get("FITID");
    const checknum = get("CHECKNUM");
    if (!date || !amt || amt.value === 0 || !memo) continue;

    // OFX é confiável: o sinal do TRNAMT define a direção; TRNTYPE confirma
    let direction: "in" | "out" = amt.sign === -1 ? "out" : "in";
    const tt = trntype.toUpperCase();
    if (["DEBIT", "PAYMENT", "FEE", "SRVCHG", "ATM", "CASH", "DIRECTDEBIT", "REPEATPMT", "CHECK"].includes(tt)) direction = "out";
    else if (["CREDIT", "DEP", "DEPOSIT", "DIRECTDEP", "INT"].includes(tt)) direction = "in";

    if (fitid) {
      if (seenFitIds.has(fitid)) { dupInFile++; continue; }
      seenFitIds.add(fitid);
    }

    rows.push({
      date,
      description: memo,
      original_description: memo,
      value: amt.value,
      direction,
      balance_after: null,
      external_id: fitid || checknum || null,
      raw: { fitid, trntype, memo, dtposted: dtRaw, trnamt: get("TRNAMT"), checknum },
    });
  }

  if (dupInFile > 0) warnings.push(`${dupInFile} transação(ões) repetida(s) dentro do próprio arquivo (mesmo identificador) foram descartadas.`);
  if (ledgerBal) warnings.push(`Saldo informado pelo banco no arquivo: R$ ${ledgerBal.value.toFixed(2)}.`);

  return {
    rows,
    headers: [],
    rawRows: [],
    format: "ofx",
    bankName,
    warnings,
    needsMapping: false,
  };
}

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".ofx") || name.endsWith(".qfx")) return parseOFXFile(file);
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseXLSXFile(file);
  if (name.endsWith(".csv") || name.endsWith(".txt")) return parseCSVFile(file);
  if (name.endsWith(".pdf")) throw new Error("PDF ainda não é suportado. Baixe o extrato em OFX, CSV ou XLSX no app do seu banco.");
  throw new Error("Formato não reconhecido. Use OFX, CSV ou XLSX.");
}

/* ------------------------------------------------------------------ */
/* Deduplicação                                                        */
/* ------------------------------------------------------------------ */

function djb2(key: string): string {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function dedupeHash(
  userId: string,
  accountId: string | null,
  row: { date: string; value: number; description: string; direction: "in" | "out"; external_id?: string | null },
): string {
  if (row.external_id) {
    return `x_${djb2(`${userId}|${accountId || "none"}|${row.external_id}`)}`;
  }
  const desc = norm(row.description).slice(0, 80);
  const key = `${userId}|${accountId || "none"}|${row.date}|${row.direction}|${row.value.toFixed(2)}|${desc}`;
  return `h_${djb2(key)}_${row.value.toFixed(2)}_${row.date}`;
}

export interface FileSummary {
  count: number;
  totalIn: number;
  totalOut: number;
  net: number;
  periodStart: string | null;
  periodEnd: string | null;
  internalDuplicates: number;
}

export function summarize(rows: ParsedRow[]): FileSummary {
  const totalIn = rows.filter((r) => r.direction === "in").reduce((s, r) => s + r.value, 0);
  const totalOut = rows.filter((r) => r.direction === "out").reduce((s, r) => s + r.value, 0);
  const dates = rows.map((r) => r.date).sort();
  const seen = new Map<string, number>();
  rows.forEach((r) => {
    const k = `${r.date}|${r.direction}|${r.value.toFixed(2)}|${norm(r.description)}`;
    seen.set(k, (seen.get(k) || 0) + 1);
  });
  let internalDuplicates = 0;
  seen.forEach((n) => { if (n > 1) internalDuplicates += n - 1; });
  return {
    count: rows.length,
    totalIn: Math.round(totalIn * 100) / 100,
    totalOut: Math.round(totalOut * 100) / 100,
    net: Math.round((totalIn - totalOut) * 100) / 100,
    periodStart: dates[0] || null,
    periodEnd: dates[dates.length - 1] || null,
    internalDuplicates,
  };
}
