import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSaveTransaction } from "@/hooks/usePersonalFinance";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, todayStr, type PersonalTx, type TxType } from "@/lib/personalFinance";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: PersonalTx | null;
  defaultType?: TxType;
}

export function TransactionDialog({ open, onOpenChange, editing, defaultType = "expense" }: Props) {
  const { toast } = useToast();
  const save = useSaveTransaction();
  const [type, setType] = useState<TxType>(defaultType);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayStr());
  const [isPaid, setIsPaid] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? defaultType);
    setAmount(editing ? String(editing.amount) : "");
    setCategory(editing?.category ?? "");
    setDescription(editing?.description ?? "");
    setDate(editing?.tx_date ?? todayStr());
    setIsPaid(editing?.is_paid ?? true);
    setIsRecurring(editing?.is_recurring ?? false);
  }, [open, editing, defaultType]);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const submit = async () => {
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0 || !category) {
      toast({ title: "Preencha valor e categoria", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({
        id: editing?.id, type, amount: value, category, description: description.trim(),
        tx_date: date, payment_method: editing?.payment_method ?? null,
        is_paid: isPaid, is_recurring: isRecurring,
      });
      onOpenChange(false);
    } catch {
      toast({ title: "Não foi possível salvar", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <Button key={t} type="button" variant={type === t ? "default" : "outline"}
                onClick={() => { setType(t); setCategory(""); }}>
                {t === "expense" ? "Despesa" : "Receita"}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={description} maxLength={120} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Mercado do mês" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="paid" className="text-sm">{type === "expense" ? "Já foi pago" : "Já foi recebido"}</Label>
            <Switch id="paid" checked={isPaid} onCheckedChange={setIsPaid} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="rec" className="text-sm">Repete todo mês (conta fixa)</Label>
            <Switch id="rec" checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={save.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
