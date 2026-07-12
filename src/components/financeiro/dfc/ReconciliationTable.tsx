import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Clock, EyeOff, Trash2 } from "lucide-react";
import type { CashTransaction } from "@/hooks/useCashFlow";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";

interface Props {
  transactions: CashTransaction[];
  onUpdateStatus: (id: string, status: CashTransaction["reconciliation_status"], match?: { entry_type: string; entry_id: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  matched: { label: "Conciliado", color: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  pending: { label: "Pendente", color: "bg-muted text-muted-foreground border-border", icon: Clock },
  needs_review: { label: "Necessita revisão", color: "bg-warning/15 text-warning border-warning/30", icon: AlertTriangle },
  divergent: { label: "Divergência", color: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertTriangle },
  ignored: { label: "Ignorado", color: "bg-muted text-muted-foreground border-border", icon: EyeOff },
};

export function ReconciliationTable({ transactions, onUpdateStatus, onDelete }: Props) {
  const { maskCurrency } = usePrivacyMode();
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => t.reconciliation_status === filter);
  }, [transactions, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: transactions.length };
    transactions.forEach((t) => { c[t.reconciliation_status] = (c[t.reconciliation_status] || 0) + 1; });
    return c;
  }, [transactions]);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-display font-bold text-lg mb-4">Conciliação Financeira</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "pending", "needs_review", "divergent", "matched", "ignored"] as const).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? "default" : "outline"}
            onClick={() => setFilter(k)}
          >
            {k === "all" ? "Todos" : STATUS_META[k]?.label} ({counts[k] || 0})
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma movimentação neste filtro. Importe um extrato ou registre movimentações manuais.
        </p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filtered.map((t) => {
            const meta = STATUS_META[t.reconciliation_status];
            const Icon = meta?.icon || Clock;
            const suggestion = t.suggested_match as any;
            return (
              <div key={t.id} className="p-3 border border-border rounded-lg bg-secondary/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={meta?.color}>
                        <Icon className="w-3 h-3 mr-1" />{meta?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.transaction_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{t.source.replace("_", " ")}</span>
                    </div>
                    <p className="text-sm font-medium mt-1 truncate">{t.description}</p>
                    {suggestion && t.reconciliation_status !== "matched" && (
                      <div className="mt-2 p-2 bg-info/5 border border-info/20 rounded text-xs">
                        <strong>Sugestão:</strong> {suggestion.description} · {maskCurrency(suggestion.value)}
                        <div className="mt-1 flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => onUpdateStatus(t.id, "matched", { entry_type: suggestion.entry_type, entry_id: suggestion.entry_id })}>
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => onUpdateStatus(t.id, "ignored")}>
                            Ignorar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-display font-semibold text-sm ${t.direction === "in" ? "text-success" : "text-destructive"}`}>
                      {t.direction === "in" ? "+" : "-"}{maskCurrency(t.value)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(t.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}