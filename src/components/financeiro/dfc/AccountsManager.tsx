import { useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CashAccount } from "@/hooks/useCashFlow";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";

interface Props {
  accounts: CashAccount[];
  onCreate: (data: Partial<CashAccount>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AccountsManager({ accounts, onCreate, onDelete }: Props) {
  const { maskCurrency } = usePrivacyMode();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "banco", initial_balance: 0 });

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <Wallet className="w-5 h-5" /> Contas de Caixa
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova conta de caixa</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Nubank PJ" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="banco">Banco</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="maquininha">Maquininha</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Saldo inicial (R$)</Label>
                <Input type="number" step="0.01" value={form.initial_balance}
                  onChange={(e) => setForm({ ...form, initial_balance: parseFloat(e.target.value) || 0 })} />
              </div>
              <Button
                className="w-full"
                onClick={async () => {
                  if (!form.name) return;
                  await onCreate({ name: form.name, type: form.type as any, initial_balance: form.initial_balance });
                  setForm({ name: "", type: "banco", initial_balance: 0 });
                  setOpen(false);
                }}
              >
                Criar conta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((a) => (
          <div key={a.id} className="border border-border rounded-lg p-4 bg-secondary/30">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: a.color || "#22C55E" }} />
                  <p className="font-semibold">{a.name}</p>
                </div>
                <p className="text-xs text-muted-foreground capitalize mt-1">{a.type}</p>
                <p className="text-sm mt-2">Saldo inicial: {maskCurrency(a.initial_balance)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onDelete(a.id)} className="h-8 w-8">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-6">
            Nenhuma conta cadastrada.
          </p>
        )}
      </div>
    </div>
  );
}