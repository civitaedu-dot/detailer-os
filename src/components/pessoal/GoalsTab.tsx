import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { differenceInCalendarMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { useDeleteGoal, useSaveGoal } from "@/hooks/usePersonalFinance";
import type { PersonalGoal } from "@/lib/personalFinance";

export function GoalsTab({ goals }: { goals: PersonalGoal[] }) {
  const { maskCurrency } = usePrivacyMode();
  const { toast } = useToast();
  const save = useSaveGoal();
  const del = useDeleteGoal();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deposit, setDeposit] = useState<Record<string, string>>({});

  const add = async () => {
    const value = Number(target.replace(",", "."));
    if (!name.trim() || !value || value <= 0) {
      toast({ title: "Informe o nome e o valor da meta", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({ name: name.trim(), target_amount: value, current_amount: 0, deadline: deadline || null });
      setName(""); setTarget(""); setDeadline("");
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const addDeposit = async (g: PersonalGoal) => {
    const value = Number((deposit[g.id] ?? "").replace(",", "."));
    if (!value || value <= 0) return;
    try {
      await save.mutateAsync({ ...g, current_amount: g.current_amount + value });
      setDeposit((d) => ({ ...d, [g.id]: "" }));
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_160px_160px_auto]">
        <Input placeholder="Meta (ex.: Reserva de emergência)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input inputMode="decimal" placeholder="Valor (R$)" value={target} onChange={(e) => setTarget(e.target.value)} />
        <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        <Button onClick={add} disabled={save.isPending}><Plus className="mr-1 h-4 w-4" />Criar</Button>
      </div>
      {goals.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma meta ainda.</p>}
      {goals.map((g) => {
        const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
        const missing = Math.max(g.target_amount - g.current_amount, 0);
        const months = g.deadline ? differenceInCalendarMonths(new Date(`${g.deadline}T12:00:00`), new Date()) : null;
        return (
          <div key={g.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {maskCurrency(g.current_amount)} de {maskCurrency(g.target_amount)} ({pct.toFixed(0)}%)
                  {months !== null && missing > 0 && (months > 0
                    ? ` · guardar ${maskCurrency(missing / months)}/mês até o prazo`
                    : " · prazo vencido ou neste mês")}
                  {missing === 0 && " · meta batida 🎉"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => del.mutate(g.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Progress value={pct} />
            <div className="flex gap-2">
              <Input inputMode="decimal" placeholder="Quanto guardou agora?" className="h-9"
                value={deposit[g.id] ?? ""} onChange={(e) => setDeposit((d) => ({ ...d, [g.id]: e.target.value }))} />
              <Button size="sm" variant="outline" onClick={() => addDeposit(g)}>Adicionar</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
