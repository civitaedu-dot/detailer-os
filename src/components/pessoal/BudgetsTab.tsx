import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { useDeleteBudget, useSaveBudget } from "@/hooks/usePersonalFinance";
import { EXPENSE_CATEGORIES, summarize, type PersonalBudget, type PersonalTx } from "@/lib/personalFinance";

export function BudgetsTab({ txs, budgets, month }: { txs: PersonalTx[]; budgets: PersonalBudget[]; month: string }) {
  const { maskCurrency } = usePrivacyMode();
  const { toast } = useToast();
  const save = useSaveBudget();
  const del = useDeleteBudget();
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const spent = summarize(txs, month).byCategory;

  const add = async () => {
    const value = Number(limit.replace(",", "."));
    if (!category || !value || value <= 0) {
      toast({ title: "Escolha a categoria e o limite", variant: "destructive" });
      return;
    }
    try { await save.mutateAsync({ category, monthly_limit: value }); setCategory(""); setLimit(""); }
    catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-56"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Input inputMode="decimal" placeholder="Limite mensal (R$)" value={limit} onChange={(e) => setLimit(e.target.value)} />
        <Button onClick={add} disabled={save.isPending}>Definir limite</Button>
      </div>
      {budgets.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Defina um limite por categoria para acompanhar quanto já gastou.</p>
      ) : budgets.map((b) => {
        const used = spent.find((s) => s.name === b.category)?.value ?? 0;
        const pct = (used / b.monthly_limit) * 100;
        return (
          <div key={b.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{b.category}</span>
              <span className={pct > 100 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                {maskCurrency(used)} / {maskCurrency(b.monthly_limit)} ({pct.toFixed(0)}%)
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(b.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Progress value={Math.min(pct, 100)} className={pct > 100 ? "[&>div]:bg-destructive" : pct > 80 ? "[&>div]:bg-warning" : ""} />
          </div>
        );
      })}
    </div>
  );
}
