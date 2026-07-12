import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toLocalDateString } from "@/lib/utils";
import type { CashAccount } from "@/hooks/useCashFlow";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: CashAccount[];
  onSubmit: (data: any) => Promise<boolean | void>;
}

export function ManualTransactionModal({ open, onOpenChange, accounts, onSubmit }: Props) {
  const [form, setForm] = useState({
    account_id: "",
    direction: "in" as "in" | "out",
    transaction_date: toLocalDateString(new Date()),
    description: "",
    value: 0,
    category: "",
    payment_method: "dinheiro",
    notes: "",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova movimentação</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={form.direction === "in" ? "default" : "outline"} onClick={() => setForm({ ...form, direction: "in" })}>Entrada</Button>
            <Button variant={form.direction === "out" ? "default" : "outline"} onClick={() => setForm({ ...form, direction: "out" })}>Saída</Button>
          </div>
          <div>
            <Label>Conta</Label>
            <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Pagamento avulso de cliente" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Meio</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <Button
            className="w-full"
            disabled={!form.account_id || !form.description || form.value <= 0}
            onClick={async () => {
              const ok = await onSubmit(form);
              if (ok !== false) {
                onOpenChange(false);
                setForm({ ...form, description: "", value: 0, notes: "", category: "" });
              }
            }}
          >
            Registrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}