import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, GripVertical, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { QuoteItemFormData } from "@/hooks/useQuotes";
import type { Service } from "@/hooks/useServices";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const UNITS = ["un", "hr", "dia", "m²", "pacote", "serviço", "pç", "kg", "l", "outro"];

interface TotalsData {
  subtotal: number;
  totalItemDiscounts: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

interface Props {
  items: QuoteItemFormData[];
  services: Service[];
  discountType: "percentage" | "fixed";
  discountValue: number;
  taxType: string;
  taxPercentage: number;
  totals: TotalsData;
  onItemsChange: (items: QuoteItemFormData[]) => void;
  onDiscountTypeChange: (v: "percentage" | "fixed") => void;
  onDiscountValueChange: (v: number) => void;
  onTaxTypeChange: (v: string) => void;
  onTaxPercentageChange: (v: number) => void;
}

const calcItemSubtotal = (item: QuoteItemFormData) => {
  const base = item.quantity * item.unit_price;
  return base - base * ((item.discount_percentage || 0) / 100);
};

export const QuoteItemsEditor = ({
  items,
  services,
  discountType,
  discountValue,
  taxType,
  taxPercentage,
  totals,
  onItemsChange,
  onDiscountTypeChange,
  onDiscountValueChange,
  onTaxTypeChange,
  onTaxPercentageChange,
}: Props) => {
  const [showServicePicker, setShowServicePicker] = useState(false);

  const addItem = (partial?: Partial<QuoteItemFormData>) => {
    const newItem: QuoteItemFormData = {
      name: "",
      description: "",
      unit: "un",
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      sort_order: items.length,
      ...partial,
    };
    onItemsChange([...items, newItem]);
  };

  const addFromService = (service: Service) => {
    addItem({
      service_id: service.id,
      name: service.name,
      description: service.description || "",
      unit: "un",
      quantity: 1,
      unit_price: service.default_price,
    });
    setShowServicePicker(false);
  };

  const updateItem = (idx: number, updates: Partial<QuoteItemFormData>) => {
    const updated = items.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, ...updates };
    });
    onItemsChange(updated);
  };

  const removeItem = (idx: number) => {
    onItemsChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {/* Add buttons */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowServicePicker(!showServicePicker)}
          >
            <Plus className="w-4 h-4" />
            Adicionar serviço cadastrado
            <ChevronDown className="w-3 h-3" />
          </Button>
          {showServicePicker && services.length > 0 && (
            <Card className="absolute z-50 top-10 left-0 w-72 shadow-lg border-border bg-popover">
              <CardContent className="p-2 max-h-52 overflow-y-auto space-y-0.5">
                {services.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addFromService(s)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-sm transition-colors"
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{fmt(s.default_price)}</div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => addItem()}
        >
          <Plus className="w-4 h-4" />
          Item personalizado
        </Button>
      </div>

      {/* Items */}
      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          Nenhum item adicionado. Use os botões acima para adicionar serviços ou itens personalizados.
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary/40 border border-border rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 cursor-grab" />
              <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">
                #{idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <Input
                  value={item.name}
                  onChange={e => updateItem(idx, { name: e.target.value })}
                  placeholder="Nome do serviço / produto"
                  className="bg-card border-border font-medium"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive flex-shrink-0"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <Textarea
              value={item.description || ""}
              onChange={e => updateItem(idx, { description: e.target.value })}
              placeholder="Descrição detalhada (opcional)"
              className="bg-card border-border text-sm min-h-[60px]"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Unit */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Unidade</Label>
                <Select
                  value={item.unit || "un"}
                  onValueChange={v => updateItem(idx, { unit: v })}
                >
                  <SelectTrigger className="bg-card border-border h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Qty */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Qtd</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step="0.01"
                  value={item.quantity}
                  onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                  className="bg-card border-border h-9"
                />
              </div>

              {/* Unit price */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valor unitário (R$)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={item.unit_price}
                  onChange={e => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                  className="bg-card border-border h-9"
                />
              </div>

              {/* Discount */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Desconto (%)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.1"
                  value={item.discount_percentage || 0}
                  onChange={e => updateItem(idx, { discount_percentage: parseFloat(e.target.value) || 0 })}
                  className="bg-card border-border h-9"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <span className="text-sm font-semibold text-primary">
                Subtotal: {fmt(calcItemSubtotal(item))}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {items.length > 0 && (
        <>
          <Separator />

          {/* Discount & Tax */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Desconto geral</Label>
              <div className="flex gap-2">
                <Select value={discountType} onValueChange={v => onDiscountTypeChange(v as "percentage" | "fixed")}>
                  <SelectTrigger className="w-32 bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">% Percentual</SelectItem>
                    <SelectItem value="fixed">R$ Fixo</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={discountValue}
                  onChange={e => onDiscountValueChange(parseFloat(e.target.value) || 0)}
                  placeholder={discountType === "percentage" ? "0%" : "R$ 0,00"}
                  className="bg-card border-border flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Imposto / Taxa</Label>
              <div className="flex gap-2">
                <Input
                  value={taxType}
                  onChange={e => onTaxTypeChange(e.target.value)}
                  placeholder="ex: ISS"
                  className="bg-card border-border w-24"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.1"
                  value={taxPercentage}
                  onChange={e => onTaxPercentageChange(parseFloat(e.target.value) || 0)}
                  placeholder="% imposto"
                  className="bg-card border-border flex-1"
                />
              </div>
            </div>
          </div>

          {/* Totals summary */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal dos itens</span>
              <span>{fmt(totals.subtotal)}</span>
            </div>
            {totals.totalItemDiscounts > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Descontos nos itens</span>
                <span className="text-destructive">-{fmt(totals.totalItemDiscounts)}</span>
              </div>
            )}
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Desconto geral</span>
                <span className="text-destructive">-{fmt(totals.discountAmount)}</span>
              </div>
            )}
            {totals.taxAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{taxType || "Imposto"} ({taxPercentage}%)</span>
                <span>{fmt(totals.taxAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{fmt(totals.total)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
