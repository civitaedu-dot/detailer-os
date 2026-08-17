import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { toLocalDateString } from "@/lib/utils";
import type { ParsedRow, FileFormat } from "@/lib/imports/parsers";
import { dedupeHash } from "@/lib/imports/parsers";
import { reconcileRow, type MatchCandidate } from "@/lib/imports/reconcile";
import { suggestCategory, type CategoryRule } from "@/lib/imports/categorize";

export interface CashAccount {
  id: string;
  user_id: string;
  name: string;
  type: "dinheiro" | "banco" | "pix" | "maquininha" | "outro";
  initial_balance: number;
  initial_balance_date: string;
  color: string | null;
  active: boolean;
}

export interface CashTransaction {
  id: string;
  user_id: string;
  account_id: string | null;
  transaction_date: string;
  description: string;
  value: number;
  direction: "in" | "out";
  category: string | null;
  payment_method: string | null;
  source: string;
  source_ref_id: string | null;
  import_id: string | null;
  reconciliation_status: "pending" | "matched" | "divergent" | "needs_review" | "ignored";
  matched_entry_type: string | null;
  matched_entry_id: string | null;
  suggested_match: any;
  raw_data: any;
  notes: string | null;
  created_at: string;
  original_description?: string | null;
  balance_after?: number | null;
  bank_name?: string | null;
  external_id?: string | null;
  match_confidence?: number | null;
  match_kind?: string | null;
}

export interface BankImport {
  id: string;
  filename: string;
  file_format: string;
  total_rows: number;
  matched_rows: number;
  pending_rows: number;
  duplicate_rows?: number;
  total_in?: number;
  total_out?: number;
  status: string;
  created_at: string;
  period_start: string | null;
  period_end: string | null;
  account_id: string | null;
}

export function useCashFlow(referenceDate?: Date) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [imports, setImports] = useState<BankImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ref = referenceDate || new Date();

  const ensureDefaultAccounts = useCallback(async (userId: string) => {
    const { data } = await supabase.from("cash_accounts").select("id").eq("user_id", userId).limit(1);
    if (data && data.length > 0) return;
    await supabase.from("cash_accounts").insert([
      { user_id: userId, name: "Dinheiro", type: "dinheiro", color: "#10B981" },
      { user_id: userId, name: "PIX / Banco", type: "banco", color: "#3B82F6" },
      { user_id: userId, name: "Cartão / Maquininha", type: "maquininha", color: "#8B5CF6" },
    ]);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    await ensureDefaultAccounts(user.id);
    const firstDay = toLocalDateString(new Date(ref.getFullYear(), ref.getMonth(), 1));
    const lastDay = toLocalDateString(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));

    const [{ data: accs }, { data: txs }, { data: imps }] = await Promise.all([
      supabase.from("cash_accounts").select("*").eq("user_id", user.id).order("created_at"),
      supabase
        .from("cash_transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", firstDay)
        .lte("transaction_date", lastDay)
        .order("transaction_date", { ascending: false }),
      supabase
        .from("bank_imports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setAccounts((accs as any) || []);
    setTransactions((txs as any) || []);
    setImports((imps as any) || []);
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, ref.getFullYear(), ref.getMonth(), ensureDefaultAccounts]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createAccount = async (data: Partial<CashAccount>) => {
    if (!user?.id) return;
    const { error } = await supabase.from("cash_accounts").insert({
      user_id: user.id,
      name: data.name!,
      type: (data.type as any) || "banco",
      initial_balance: data.initial_balance || 0,
      initial_balance_date: data.initial_balance_date || toLocalDateString(new Date()),
      color: data.color || "#22C55E",
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Conta criada" });
    fetchAll();
  };

  const updateAccount = async (id: string, patch: Partial<CashAccount>) => {
    const { error } = await supabase.from("cash_accounts").update(patch as any).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from("cash_accounts").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const createManualTransaction = async (data: {
    account_id: string;
    transaction_date: string;
    description: string;
    value: number;
    direction: "in" | "out";
    category?: string;
    payment_method?: string;
    notes?: string;
  }) => {
    if (!user?.id) return;
    const hash = dedupeHash(user.id, data.account_id, {
      date: data.transaction_date,
      value: data.value,
      description: data.description,
      direction: data.direction,
    }) + "_" + Date.now();
    const { error } = await supabase.from("cash_transactions").insert({
      user_id: user.id,
      account_id: data.account_id,
      transaction_date: data.transaction_date,
      description: data.description,
      value: data.value,
      direction: data.direction,
      category: data.category || null,
      payment_method: data.payment_method || null,
      source: "manual",
      reconciliation_status: "matched",
      dedupe_hash: hash,
      notes: data.notes || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Movimentação registrada" });
    fetchAll();
    return true;
  };

  const updateTransactionStatus = async (
    id: string,
    status: CashTransaction["reconciliation_status"],
    match?: { entry_type: string; entry_id: string },
  ) => {
    const patch: any = { reconciliation_status: status };
    if (match) {
      patch.matched_entry_type = match.entry_type;
      patch.matched_entry_id = match.entry_id;
      patch.match_kind = "confirmed";
      patch.match_confidence = 100;
    }
    await supabase.from("cash_transactions").update(patch).eq("id", id);
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const updateTransactionCategory = async (id: string, category: string) => {
    await supabase.from("cash_transactions").update({ category }).eq("id", id);
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)));
  };

  const reclassifyAll = async (userRules: CategoryRule[]) => {
    if (!user?.id) return { updated: 0 };
    let updated = 0;
    for (const t of transactions) {
      if (t.category && t.category !== "Outros") continue;
      const s = suggestCategory(t.description, t.direction, userRules);
      if (s.source === "default") continue;
      await supabase.from("cash_transactions").update({ category: s.category }).eq("id", t.id);
      updated++;
    }
    toast({ title: "Reclassificação concluída", description: `${updated} movimentações atualizadas.` });
    fetchAll();
    return { updated };
  };

  const deleteTransaction = async (id: string) => {
    await supabase.from("cash_transactions").delete().eq("id", id);
    fetchAll();
  };

  // Fetch reconciliation candidates for a period
  const fetchCandidates = async (from: string, to: string): Promise<MatchCandidate[]> => {
    if (!user?.id) return [];
    const [entries, apts, fx, vc] = await Promise.all([
      supabase.from("financial_entries").select("id,description,entry_date,value,client_name,payment_method").eq("user_id", user.id).gte("entry_date", from).lte("entry_date", to),
      supabase.from("appointments").select("id,client_name,service_name,appointment_date,service_value,status,payment_method").eq("user_id", user.id).eq("status", "concluído").gte("appointment_date", from).lte("appointment_date", to),
      supabase.from("fixed_costs").select("id,name,value,is_active").eq("user_id", user.id).eq("is_active", true),
      supabase.from("variable_costs").select("id,name,value,cost_type").eq("user_id", user.id),
    ]);
    const out: MatchCandidate[] = [];
    entries.data?.forEach((e: any) =>
      out.push({
        entry_type: "financial_entry",
        entry_id: e.id,
        description: e.description,
        date: e.entry_date,
        value: Number(e.value),
        direction: "in",
        client_name: e.client_name,
        payment_method: e.payment_method,
      }),
    );
    apts.data?.forEach((a: any) =>
      out.push({
        entry_type: "appointment",
        entry_id: a.id,
        description: `${a.service_name} - ${a.client_name}`,
        date: a.appointment_date,
        value: Number(a.service_value),
        direction: "in",
        client_name: a.client_name,
        payment_method: a.payment_method,
      }),
    );
    fx.data?.forEach((f: any) =>
      out.push({
        entry_type: "fixed_cost",
        entry_id: f.id,
        description: f.name,
        date: from,
        value: Number(f.value),
        direction: "out",
        flexible_date: true,
      }),
    );
    vc.data?.forEach((v: any) =>
      out.push({
        entry_type: "variable_cost",
        entry_id: v.id,
        description: v.name,
        date: from,
        value: Number(v.value),
        direction: "out",
        flexible_date: true,
      }),
    );
    return out;
  };

  /** Verifica quais hashes já existem no banco (proteção contra duplicidade antes de gravar). */
  const findExistingHashes = async (hashes: string[]): Promise<Set<string>> => {
    if (!user?.id || hashes.length === 0) return new Set();
    const found = new Set<string>();
    const chunk = 200;
    for (let i = 0; i < hashes.length; i += chunk) {
      const { data } = await supabase
        .from("cash_transactions")
        .select("dedupe_hash")
        .eq("user_id", user.id)
        .in("dedupe_hash", hashes.slice(i, i + chunk));
      data?.forEach((d: any) => d.dedupe_hash && found.add(d.dedupe_hash));
    }
    return found;
  };

  /** Análise prévia: quantas linhas já existem no sistema, sem gravar nada. */
  const analyzeDuplicates = async (rows: ParsedRow[], accountId: string) => {
    if (!user?.id) return { duplicates: 0, hashes: [] as string[] };
    const hashes = rows.map((r) => dedupeHash(user.id, accountId, r));
    const existing = await findExistingHashes(hashes);
    return { duplicates: hashes.filter((h) => existing.has(h)).length, hashes };
  };

  const importRows = async (
    rows: ParsedRow[],
    accountId: string,
    filename: string,
    format: FileFormat,
    meta?: { bankName?: string | null },
    onProgress?: (p: { phase: string; done: number; total: number }) => void,
  ) => {
    if (!user?.id || rows.length === 0)
      return { inserted: 0, skipped: 0, matched: 0, review: 0, pending: 0, importId: null as string | null };

    const report = (phase: string, done: number, total: number) => onProgress?.({ phase, done, total });

    report("Preparando importação", 0, rows.length);

    const { data: userRulesData } = await (supabase as any)
      .from("category_rules")
      .select("*")
      .eq("user_id", user.id);
    const userRules: CategoryRule[] = (userRulesData as any) || [];

    const dates = rows.map((r) => r.date).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];

    const totalIn = rows.filter((r) => r.direction === "in").reduce((s, r) => s + r.value, 0);
    const totalOut = rows.filter((r) => r.direction === "out").reduce((s, r) => s + r.value, 0);

    const { data: importRec, error: impErr } = await supabase
      .from("bank_imports")
      .insert({
        user_id: user.id,
        account_id: accountId,
        filename,
        file_format: format as any,
        period_start: periodStart,
        period_end: periodEnd,
        total_rows: rows.length,
        total_in: Math.round(totalIn * 100) / 100,
        total_out: Math.round(totalOut * 100) / 100,
        status: "processing",
      })
      .select()
      .single();
    if (impErr || !importRec) {
      toast({ title: "Erro", description: impErr?.message, variant: "destructive" });
      return { inserted: 0, skipped: 0, matched: 0, review: 0, pending: 0, importId: null };
    }

    report("Buscando lançamentos para conciliar", 0, rows.length);
    const candidates = await fetchCandidates(periodStart, periodEnd);

    report("Verificando duplicidades", 0, rows.length);
    const hashes = rows.map((r) => dedupeHash(user.id, accountId, r));
    const existing = await findExistingHashes(hashes);

    const seenInBatch = new Set<string>();
    const usedEntryIds = new Set<string>();
    const toInsert: any[] = [];
    let skipped = 0;

    rows.forEach((r, idx) => {
      const hash = hashes[idx];
      if (existing.has(hash) || seenInBatch.has(hash)) { skipped++; return; }
      seenInBatch.add(hash);

      const outcome = reconcileRow(r, candidates.filter((c) => !usedEntryIds.has(c.entry_id)));
      if (outcome.status === "matched" && outcome.matched_entry_id) usedEntryIds.add(outcome.matched_entry_id);

      const catSuggestion = suggestCategory(r.description, r.direction, userRules);
      const category = catSuggestion.source === "default" ? null : catSuggestion.category;

      toInsert.push({
        user_id: user.id,
        account_id: accountId,
        transaction_date: r.date,
        description: r.description,
        original_description: r.original_description || r.description,
        value: r.value,
        direction: r.direction,
        balance_after: r.balance_after ?? null,
        bank_name: meta?.bankName || null,
        external_id: r.external_id || null,
        category,
        source: "import" as const,
        import_id: importRec.id,
        reconciliation_status: outcome.status,
        matched_entry_type: outcome.matched_entry_type || null,
        matched_entry_id: outcome.matched_entry_id || null,
        match_confidence: outcome.confidence,
        match_kind: outcome.kind,
        suggested_match: outcome.suggested_match || null,
        raw_data: r.raw as any,
        dedupe_hash: hash,
      });
    });

    // Inserção em lotes (rápida) com fallback linha a linha em caso de conflito
    let inserted = 0;
    const CHUNK = 100;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const batch = toInsert.slice(i, i + CHUNK);
      const { error } = await supabase.from("cash_transactions").insert(batch as any);
      if (error) {
        for (const row of batch) {
          const { error: e2 } = await supabase.from("cash_transactions").insert([row] as any);
          if (e2) { if (e2.code === "23505") skipped++; else console.error(e2); }
          else inserted++;
        }
      } else {
        inserted += batch.length;
      }
      report("Gravando movimentações", Math.min(i + CHUNK, toInsert.length), toInsert.length);
      // libera a thread para a UI respirar em arquivos grandes
      await new Promise((res) => setTimeout(res, 0));
    }

    const insertedRows = toInsert.slice(0, inserted);
    const matched = insertedRows.filter((r) => r.reconciliation_status === "matched").length;
    const review = insertedRows.filter((r) => r.reconciliation_status === "needs_review" || r.reconciliation_status === "divergent").length;
    const pending = insertedRows.filter((r) => r.reconciliation_status === "pending").length;

    await supabase
      .from("bank_imports")
      .update({
        status: "completed",
        matched_rows: matched,
        pending_rows: pending,
        duplicate_rows: skipped,
      })
      .eq("id", importRec.id);

    report("Concluído", toInsert.length, toInsert.length);

    toast({
      title: "Extrato importado",
      description: `${inserted} movimentações gravadas · ${matched} conciliadas automaticamente · ${review} aguardando confirmação · ${skipped} duplicadas ignoradas.`,
    });
    fetchAll();
    return { inserted, skipped, matched, review, pending, importId: importRec.id };
  };

  return {
    accounts,
    transactions,
    imports,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    createManualTransaction,
    analyzeDuplicates,
    updateTransactionStatus,
    updateTransactionCategory,
    reclassifyAll,
    deleteTransaction,
    importRows,
    refetch: fetchAll,
  };
}