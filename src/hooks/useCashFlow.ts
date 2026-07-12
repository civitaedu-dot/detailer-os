import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { toLocalDateString } from "@/lib/utils";
import type { ParsedRow } from "@/lib/imports/parsers";
import { dedupeHash } from "@/lib/imports/parsers";
import { reconcileRow, type MatchCandidate } from "@/lib/imports/reconcile";

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
}

export interface BankImport {
  id: string;
  filename: string;
  file_format: string;
  total_rows: number;
  matched_rows: number;
  pending_rows: number;
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
    }
    await supabase.from("cash_transactions").update(patch).eq("id", id);
    fetchAll();
  };

  const deleteTransaction = async (id: string) => {
    await supabase.from("cash_transactions").delete().eq("id", id);
    fetchAll();
  };

  // Fetch reconciliation candidates for a period
  const fetchCandidates = async (from: string, to: string): Promise<MatchCandidate[]> => {
    if (!user?.id) return [];
    const [entries, apts, fx, vc] = await Promise.all([
      supabase.from("financial_entries").select("id,description,entry_date,value").eq("user_id", user.id).gte("entry_date", from).lte("entry_date", to),
      supabase.from("appointments").select("id,client_name,service_name,appointment_date,service_value,status").eq("user_id", user.id).eq("status", "concluído").gte("appointment_date", from).lte("appointment_date", to),
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
      }),
    );
    return out;
  };

  const importRows = async (
    rows: ParsedRow[],
    accountId: string,
    filename: string,
    format: "csv" | "xlsx" | "ofx" | "pdf",
  ) => {
    if (!user?.id || rows.length === 0) return { inserted: 0, skipped: 0, importId: null as string | null };
    const dates = rows.map((r) => r.date).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];

    const { data: importRec, error: impErr } = await supabase
      .from("bank_imports")
      .insert({
        user_id: user.id,
        account_id: accountId,
        filename,
        file_format: format,
        period_start: periodStart,
        period_end: periodEnd,
        total_rows: rows.length,
        status: "processing",
      })
      .select()
      .single();
    if (impErr || !importRec) {
      toast({ title: "Erro", description: impErr?.message, variant: "destructive" });
      return { inserted: 0, skipped: 0, importId: null };
    }

    const candidates = await fetchCandidates(periodStart, periodEnd);

    const alreadyMatchedIds = new Set<string>();
    const toInsert = rows.map((r) => {
      const hash = dedupeHash(user.id, accountId, r);
      const outcome = reconcileRow(r, candidates.filter((c) => !alreadyMatchedIds.has(c.entry_id)));
      if (outcome.status === "matched" && outcome.matched_entry_id) {
        alreadyMatchedIds.add(outcome.matched_entry_id);
      }
      return {
        user_id: user.id,
        account_id: accountId,
        transaction_date: r.date,
        description: r.description,
        value: r.value,
        direction: r.direction,
        source: "import" as const,
        import_id: importRec.id,
        reconciliation_status: outcome.status,
        matched_entry_type: outcome.matched_entry_type || null,
        matched_entry_id: outcome.matched_entry_id || null,
        suggested_match: outcome.suggested_match || null,
        raw_data: r.raw as any,
        dedupe_hash: hash,
      };
    });

    // Insert one at a time to skip duplicates gracefully
    let inserted = 0;
    let skipped = 0;
    let matched = 0;
    let pending = 0;
    for (const row of toInsert) {
      const { error } = await supabase.from("cash_transactions").insert([row] as any);
      if (error) {
        if (error.code === "23505") skipped++;
        else console.error(error);
      } else {
        inserted++;
        if (row.reconciliation_status === "matched") matched++;
        else if (row.reconciliation_status === "pending") pending++;
      }
    }

    await supabase
      .from("bank_imports")
      .update({
        status: "completed",
        matched_rows: matched,
        pending_rows: pending,
      })
      .eq("id", importRec.id);

    toast({
      title: "Extrato importado",
      description: `${inserted} novas movimentações, ${skipped} duplicadas ignoradas.`,
    });
    fetchAll();
    return { inserted, skipped, importId: importRec.id };
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
    updateTransactionStatus,
    deleteTransaction,
    importRows,
    refetch: fetchAll,
  };
}