import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, HelpCircle, Copy, EyeOff, Sparkles } from "lucide-react";
import type { CashTransaction } from "@/hooks/useCashFlow";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { CategoryPicker } from "./CategoryPicker";
import type { StoredCategoryRule } from "@/hooks/useCategoryRules";

interface Props {
  transactions: CashTransaction[];
  rules: StoredCategoryRule[];
  onUpdateStatus: (id: string, status: CashTransaction["reconciliation_status"], match?: { entry_type: string; entry_id: string }) => Promise<void>;
  onUpdateCategory: (id: string, category: string, description: string, direction: "in" | "out") => Promise<void>;
}

type Group = "suggestions" | "divergent" | "unmatched" | "duplicates";

const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

export function ReviewCenter({ transactions, rules, onUpdateStatus, onUpdateCategory }: Props) {
  const { maskCurrency } = usePrivacyMode();
  const [group, setGroup] = useState<Group>("suggestions");

  const groups = useMemo(() => {
    const active = transactions.filter((t) => t.reconciliation_status !== "ignored");
    const suggestions = active.filter((t) => t.reconciliation_status === "needs_review" && t.suggested_match);
    const divergent = active.filter((t) => t.reconciliation_status === "divergent");
    const unmatched = active.filter((t) => t.reconciliation_status === "pending");

    // possíveis duplicidades: mesma data + valor + direção dentro da base
    const map = new Map<string, CashTransaction[]>();
    active.forEach((t) => {
      const k = `${t.transaction_date}|${t.direction}|${Number(t.value).toFixed(2)}`;
      map.set(k, [...(map.get(k) || []), t]);
    });
    const duplicates: CashTransaction[] = [];
    map.forEach((list) => { if (list.length > 1) duplicates.push(...list); });

    return { suggestions, divergent, unmatched, duplicates };
  }, [transactions]);

  const tabs: Array<{ key: Group; label: string; icon: any; count: number; tone: string }> = [
    { key: "suggestions", label: "Sugestões", icon: HelpCircle, count: groups.suggestions.length, tone: "text-info" },
    { key: "divergent", label: "Divergências", icon: AlertTriangle, count: groups.divergent.length, tone: "text-warning" },
    { key: "unmatched", label: "Não conciliadas", icon: Sparkles, count: groups.unmatched.length, tone: "text-muted-foreground" },
    { key: "duplicates", label: "Possíveis duplicidades", icon: Copy, count: groups.duplicates.length, tone: "text-destructive" },
  ];

  const list = groups[group];

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6">
      <h3 className="font-display font-bold text-lg mb-1">Revisão de conciliação</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Aqui aparece apenas o que precisa da sua atenção. Nada é conciliado automaticamente quando há dúvida.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <Button key={t.key} size="sm" variant={group === t.key ? "default" : "outline"} onClick={() => setGroup(t.key)}>
            <t.icon className="w-3.5 h-3.5 mr-1" /> {t.label} ({t.count})
          </Button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Nada para revisar neste grupo. 🎉
        </p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {list.map((t) => {
            const s = t.suggested_match as any;
            const conf = Number(t.match_confidence || 0);
            return (
              <div key={t.id} className="p-3 border border-border rounded-lg bg-secondary/30">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{fmtDate(t.transaction_date)}</span>
                      {t.bank_name && <Badge variant="outline" className="text-[10px]">{t.bank_name}</Badge>}
                      {conf > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/30">
                          {conf}% de confiança
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-1">{t.description}</p>
                    {t.original_description && t.original_description !== t.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                        Original: {t.original_description}
                      </p>
                    )}
                    <div className="mt-2">
                      <CategoryPicker
                        value={t.category}
                        description={t.description}
                        direction={t.direction}
                        rules={rules}
                        onChange={(cat) => onUpdateCategory(t.id, cat, t.description, t.direction)}
                      />
                    </div>
                  </div>
                  <span className={`font-display font-semibold text-sm ${t.direction === "in" ? "text-success" : "text-destructive"}`}>
                    {t.direction === "in" ? "+" : "-"}{maskCurrency(Number(t.value))}
                  </span>
                </div>

                {s && group !== "duplicates" && (
                  <div className="mt-2 p-2 bg-info/5 border border-info/20 rounded text-xs">
                    <p>
                      <strong>Possível correspondência:</strong> {s.description} · {maskCurrency(Number(s.value))} · {s.date ? fmtDate(s.date) : ""}
                    </p>
                    {Array.isArray(s.reasons) && s.reasons.length > 0 && (
                      <p className="text-muted-foreground mt-0.5">Motivos: {s.reasons.join(", ")}.</p>
                    )}
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => onUpdateStatus(t.id, "matched", { entry_type: s.entry_type, entry_id: s.entry_id })}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmar conciliação
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onUpdateStatus(t.id, "pending")}>
                        Não é essa
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onUpdateStatus(t.id, "ignored")}>
                        <EyeOff className="w-3 h-3 mr-1" /> Ignorar
                      </Button>
                    </div>
                  </div>
                )}

                {group === "unmatched" && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus(t.id, "matched")}>
                      Marcar como conferida
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onUpdateStatus(t.id, "ignored")}>
                      Ignorar
                    </Button>
                  </div>
                )}

                {group === "duplicates" && (
                  <div className="mt-2 flex gap-2 flex-wrap items-center">
                    <span className="text-xs text-warning">
                      Existe outra movimentação com a mesma data, valor e tipo. Confira se não é um lançamento repetido.
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onUpdateStatus(t.id, "ignored")}>
                      <EyeOff className="w-3 h-3 mr-1" /> Ignorar esta
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
