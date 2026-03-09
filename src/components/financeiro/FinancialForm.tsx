import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  HelpCircle, 
  Loader2,
  Save,
  Info
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FinancialData } from "@/hooks/useFinancialData";

interface FinancialFormProps {
  initialData: FinancialData | null;
  onSave: (data: Omit<FinancialData, 'id'>) => Promise<void>;
  isSaving: boolean;
  hideVariableCosts?: boolean;
}

export function FinancialForm({ initialData, onSave, isSaving, hideVariableCosts = false }: FinancialFormProps) {
  const [fixedCosts, setFixedCosts] = useState("");
  const [variableCosts, setVariableCosts] = useState("");
  const [workingDays, setWorkingDays] = useState("22");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFixedCosts(initialData.fixed_costs > 0 ? initialData.fixed_costs.toString() : "");
      setVariableCosts(initialData.variable_costs_percentage > 0 ? initialData.variable_costs_percentage.toString() : "");
      setWorkingDays(initialData.working_days_per_month.toString());
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      fixed_costs: parseFloat(fixedCosts) || 0,
      variable_costs_percentage: parseFloat(variableCosts) || 0,
      working_days_per_month: parseInt(workingDays) || 22,
      monthly_goal: initialData?.monthly_goal ?? null,
      use_automatic_goal: initialData?.use_automatic_goal ?? true,
      hours_per_day: initialData?.hours_per_day ?? 8,
      avg_services_per_day: initialData?.avg_services_per_day ?? 3,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <h2 className="font-display text-xl font-bold mb-6">Dados Financeiros</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Custos Fixos */}
        <div className="space-y-2">
          <Label htmlFor="fixedCosts" className="text-base font-medium">
            Custos Fixos Mensais (R$)
          </Label>
          <Input
            id="fixedCosts"
            type="number"
            placeholder="Ex: 5000"
            value={fixedCosts}
            onChange={(e) => setFixedCosts(e.target.value)}
            className="h-12 text-lg"
            min="0"
            step="0.01"
          />
          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Custos fixos são despesas que existem mesmo sem vender nada, como aluguel, salários, energia, internet, água, sistemas, etc.
            </p>
          </div>
        </div>

        {/* Custos Variáveis - Only show if not hidden */}
        {!hideVariableCosts && (
          <div className="space-y-2">
            <Label htmlFor="variableCosts" className="text-base font-medium">
              Custos Variáveis (%)
            </Label>
            <Input
              id="variableCosts"
              type="number"
              placeholder="Ex: 15"
              value={variableCosts}
              onChange={(e) => setVariableCosts(e.target.value)}
              className="h-12 text-lg"
              min="0"
              max="100"
              step="0.1"
            />
            <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Custos variáveis são gastos que aumentam conforme você vende mais. Exemplos: produtos usados por serviço, comissões, materiais, taxas de cartão.
              </p>
            </div>

            <Collapsible open={isHelpOpen} onOpenChange={setIsHelpOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Como calcular meu custo variável?
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Siga estes passos simples:
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Pegue o valor médio gasto em produtos por serviço</li>
                    <li>Divida pelo valor médio cobrado do cliente</li>
                    <li>Multiplique por 100 para encontrar o percentual</li>
                  </ol>
                  <div className="p-3 rounded bg-background/50">
                    <p className="text-sm font-medium text-primary mb-1">Exemplo prático:</p>
                    <p className="text-sm text-muted-foreground">
                      Se você gasta em média <strong>R$ 15</strong> de produto em um serviço de <strong>R$ 100</strong>, seu custo variável é <strong>15%</strong>.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Cálculo: (15 ÷ 100) × 100 = 15%
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Dias Trabalhados */}
        <div className="space-y-2">
          <Label htmlFor="workingDays" className="text-base font-medium">
            Dias Trabalhados no Mês
          </Label>
          <Input
            id="workingDays"
            type="number"
            placeholder="Ex: 22"
            value={workingDays}
            onChange={(e) => setWorkingDays(e.target.value)}
            className="h-12 text-lg"
            min="1"
            max="31"
          />
          <p className="text-sm text-muted-foreground">
            Usado para calcular a meta de faturamento diário.
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 text-lg" 
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salvar Dados
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
