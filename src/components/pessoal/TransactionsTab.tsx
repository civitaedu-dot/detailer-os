import { useState } from "react";
import { Check, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { useDeleteTransaction, useTogglePaid } from "@/hooks/usePersonalFinance";
import { TransactionDialog } from "./TransactionDialog";
import type { PersonalTx } from "@/lib/personalFinance";

export function TransactionsTab({ txs, month }: { txs: PersonalTx[]; month: string }) {
  const { maskCurrency } = usePrivacyMode();
  const { toast } = useToast();
  const del = useDeleteTransaction();
  const toggle = useTogglePaid();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalTx | null>(null);
  const list = txs.filter((t) => t.tx_date.startsWith(month));

  const remove = (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    del.mutate(id, { onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }) });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-1 h-4 w-4" />Novo lançamento</Button>
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum lançamento neste mês. Adicione um ou peça ao assistente: “gastei 85 no mercado”.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {list.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3">
              <button
                title={t.is_paid ? "Marcar como pendente" : "Marcar como pago"}
                onClick={() => toggle.mutate({ id: t.id, is_paid: !t.is_paid })}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  t.is_paid ? "border-success bg-success/15 text-success" : "border-border text-transparent hover:text-muted-foreground"}`}
              ><Check className="h-4 w-4" /></button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.description || t.category}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {t.tx_date.split("-").reverse().slice(0, 2).join("/")} · {t.category}
                  {t.is_recurring && <Repeat className="h-3 w-3" />}
                  {!t.is_paid && <Badge variant="outline" className="h-4 px-1.5 text-[10px]">pendente</Badge>}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-semibold ${t.type === "income" ? "text-success" : ""}`}>
                {t.type === "income" ? "+" : "−"}{maskCurrency(t.amount)}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
      <TransactionDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
