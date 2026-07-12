import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedRow {
  date: string; // YYYY-MM-DD
  description: string;
  value: number; // positive number; direction inferred
  direction: "in" | "out";
  raw: Record<string, unknown>;
}

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  rawRows: Record<string, unknown>[];
  format: "csv" | "xlsx" | "ofx" | "pdf";
}

export interface ColumnMapping {
  date: string;
  description: string;
  value: string;
  type?: string; // optional column that says entrada/saida
}

function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  let s = String(v).trim().replace(/[R$\s]/g, "");
  // Handle formats: 1.234,56 (pt-BR) or 1,234.56 (en)
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // assume last separator is decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const isNegParen = /^\(.*\)$/.test(s);
  if (isNegParen) s = "-" + s.replace(/[()]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return toYMD(v);
  const s = String(v).trim();
  // dd/mm/yyyy or dd-mm-yyyy
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // OFX: yyyymmdd
  const ofx = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : toYMD(d);
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Heuristic auto-detect column mapping
export function autoDetectMapping(headers: string[]): Partial<ColumnMapping> {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (patterns: RegExp[]) =>
    headers[lower.findIndex((h) => patterns.some((p) => p.test(h)))];
  return {
    date: find([/data/, /date/, /dt/]),
    description: find([/descri/, /histor/, /memo/, /detalh/, /descri[cç][aã]o/]),
    value: find([/valor/, /amount/, /credit|debit/, /montante/, /^v(a|l)/]),
    type: find([/tipo/, /type/, /d\/c/, /credit.*debit/]),
  };
}

export function applyMapping(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMapping,
): ParsedRow[] {
  return rawRows
    .map((row) => {
      const date = parseDate(row[mapping.date]);
      const value = parseNumber(row[mapping.value]);
      const description = String(row[mapping.description] ?? "").trim();
      if (!date || value === null || !description) return null;
      let direction: "in" | "out" = value >= 0 ? "in" : "out";
      if (mapping.type && row[mapping.type]) {
        const t = String(row[mapping.type]).toLowerCase();
        if (/(sa[íi]da|debit|d\b|paga)/.test(t)) direction = "out";
        else if (/(entrada|credit|c\b|receb)/.test(t)) direction = "in";
      }
      return {
        date,
        description,
        value: Math.abs(value),
        direction,
        raw: row,
      } as ParsedRow;
    })
    .filter((x): x is ParsedRow => x !== null);
}

export async function parseCSV(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      complete: (res) => {
        resolve({
          headers: (res.meta.fields as string[]) || [],
          rows: res.data as Record<string, unknown>[],
        });
      },
      error: reject,
    });
  });
}

export async function parseXLSX(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

// Simple OFX parser (SGML/XML hybrid). Extracts STMTTRN blocks.
export async function parseOFX(file: File): Promise<ParsedRow[]> {
  const text = await file.text();
  const rows: ParsedRow[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  for (const block of blocks) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
      return m ? m[1].trim() : "";
    };
    const dtRaw = get("DTPOSTED");
    const date = parseDate(dtRaw);
    const amt = parseNumber(get("TRNAMT"));
    const memo = get("MEMO") || get("NAME") || get("TRNTYPE");
    if (!date || amt === null || !memo) continue;
    rows.push({
      date,
      description: memo,
      value: Math.abs(amt),
      direction: amt >= 0 ? "in" : "out",
      raw: { fitid: get("FITID"), trntype: get("TRNTYPE"), memo, dtposted: dtRaw, trnamt: amt },
    });
  }
  return rows;
}

export function dedupeHash(userId: string, accountId: string | null, row: { date: string; value: number; description: string; direction: "in" | "out" }): string {
  const key = `${userId}|${accountId || "none"}|${row.date}|${row.direction}|${row.value.toFixed(2)}|${row.description.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80)}`;
  // simple djb2 hash to keep it short
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return `h_${(h >>> 0).toString(36)}_${row.value.toFixed(2)}_${row.date}`;
}