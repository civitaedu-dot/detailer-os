import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Percent, Save, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePaymentMethodFees, PAYMENT_METHODS, getPaymentMethodLabel } from '@/hooks/usePaymentMethodFees';

export function PaymentFeesManager() {
  const { fees, isSaving, upsertFee, deleteFee } = usePaymentMethodFees();
  const [newMethod, setNewMethod] = useState('');
  const [newPercentage, setNewPercentage] = useState('');

  const usedMethods = fees.map((f) => f.method);
  const availableMethods = PAYMENT_METHODS.filter(
    (m) => !usedMethods.includes(m.value) && m.value !== 'dinheiro' // dinheiro has no fee
  );

  const handleAdd = async () => {
    if (!newMethod || !newPercentage) return;
    await upsertFee({ method: newMethod, fee_percentage: Number(newPercentage) });
    setNewMethod('');
    setNewPercentage('');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Taxas por Forma de Pagamento</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Configure as taxas cobradas por cada meio de pagamento para calcular custos reais.
      </p>

      {/* Existing fees */}
      {fees.length > 0 && (
        <div className="space-y-2 mb-4">
          {fees.map((fee) => (
            <div
              key={fee.id}
              className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{getPaymentMethodLabel(fee.method)}</p>
                  {fee.description && (
                    <p className="text-xs text-muted-foreground">{fee.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  {fee.fee_percentage.toFixed(2)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteFee(fee.id)}
                  disabled={isSaving}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new fee */}
      {availableMethods.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border">
          <div className="flex-1">
            <Label className="text-xs">Forma de Pagamento</Label>
            <Select value={newMethod} onValueChange={setNewMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {availableMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-28">
            <Label className="text-xs">Taxa (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={newPercentage}
              onChange={(e) => setNewPercentage(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newMethod || !newPercentage || isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">💡 Dica:</strong> As taxas cadastradas serão usadas automaticamente
          para calcular o custo real de cada pagamento recebido nos relatórios financeiros.
        </p>
      </div>
    </motion.div>
  );
}
