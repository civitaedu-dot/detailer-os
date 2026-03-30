import { useState } from "react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Trash2, 
  Info, 
  Percent, 
  DollarSign,
  Edit2,
  Check,
  X,
  Loader2,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useVariableCosts, VariableCost, VariableCostInput } from "@/hooks/useVariableCosts";
import { cn } from "@/lib/utils";

interface VariableCostsManagerProps {
  monthlyRevenue: number;
  onTotalPercentageChange: (percentage: number) => void;
}

const COMMON_COSTS = [
  { name: "Comissão de funcionários", type: "percentage" as const, defaultValue: 10 },
  { name: "Taxa de cartão de crédito", type: "percentage" as const, defaultValue: 3 },
  { name: "Taxa de cartão de débito", type: "percentage" as const, defaultValue: 1.5 },
  { name: "Produtos utilizados", type: "percentage" as const, defaultValue: 15 },
  { name: "Taxa de marketplace", type: "percentage" as const, defaultValue: 5 },
];

export function VariableCostsManager({ monthlyRevenue, onTotalPercentageChange }: VariableCostsManagerProps) {
  const { 
    variableCosts, 
    isLoading, 
    isSaving, 
    addVariableCost, 
    updateVariableCost, 
    deleteVariableCost,
    calculateTotalPercentage 
  } = useVariableCosts();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  
  // Form state
  const [newCost, setNewCost] = useState<VariableCostInput>({
    name: "",
    cost_type: "percentage",
    value: 0,
    description: "",
  });

  const [editCost, setEditCost] = useState<VariableCostInput>({
    name: "",
    cost_type: "percentage",
    value: 0,
    description: "",
  });

  const totalPercentage = calculateTotalPercentage(monthlyRevenue);

  // Notify parent of total percentage changes
  const handleTotalChange = () => {
    onTotalPercentageChange(calculateTotalPercentage(monthlyRevenue));
  };

  const handleAddCost = async () => {
    if (!newCost.name.trim() || newCost.value <= 0) return;
    
    await addVariableCost(newCost);
    setNewCost({ name: "", cost_type: "percentage", value: 0, description: "" });
    setShowAddForm(false);
    handleTotalChange();
  };

  const handleQuickAdd = async (preset: typeof COMMON_COSTS[0]) => {
    await addVariableCost({
      name: preset.name,
      cost_type: preset.type,
      value: preset.defaultValue,
    });
    handleTotalChange();
  };

  const handleStartEdit = (cost: VariableCost) => {
    setEditingId(cost.id);
    setEditCost({
      name: cost.name,
      cost_type: cost.cost_type,
      value: cost.value,
      description: cost.description,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editCost.name.trim() || editCost.value <= 0) return;
    
    await updateVariableCost(editingId, editCost);
    setEditingId(null);
    handleTotalChange();
  };

  const handleDelete = async (id: string) => {
    await deleteVariableCost(id);
    handleTotalChange();
  };

  const { maskCurrency } = usePrivacyMode();
  const formatCurrency = (value: number) => maskCurrency(value);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold">Custos Variáveis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre seus custos que variam conforme o faturamento
          </p>
        </div>
      </div>

      {/* Educational Section */}
      <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              <strong>Custos variáveis</strong> são despesas que aumentam conforme suas vendas crescem. 
              Quanto mais você fatura, mais gasta com esses itens.
            </p>
            <Collapsible open={isHelpOpen} onOpenChange={setIsHelpOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto">
                  <HelpCircle className="w-4 h-4 mr-1" />
                  Ver exemplos comuns
                  <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", isHelpOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                  <li><strong>Comissão de funcionários:</strong> percentual pago sobre cada serviço</li>
                  <li><strong>Taxa de cartão:</strong> percentual cobrado pela máquina de cartão</li>
                  <li><strong>Produtos utilizados:</strong> custo de materiais usados em cada serviço</li>
                  <li><strong>Taxa de marketplace:</strong> comissão de plataformas de agendamento</li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>

      {/* Total Summary Card */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Custo Variável Total</p>
            <p className="text-3xl font-bold text-primary">{totalPercentage.toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Sobre faturamento atual</p>
            <p className="text-lg font-semibold">
              {formatCurrency((monthlyRevenue * totalPercentage) / 100)}
            </p>
          </div>
        </div>
        {variableCosts.length === 0 && (
          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-primary/20">
            Adicione seus custos variáveis abaixo para um cálculo preciso.
          </p>
        )}
      </div>

      {/* Quick Add Presets */}
      {variableCosts.length === 0 && (
        <Collapsible open={isExamplesOpen} onOpenChange={setIsExamplesOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar custos comuns rapidamente
              <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", isExamplesOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMON_COSTS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="ghost"
                  size="sm"
                  className="justify-start h-auto py-2 px-3"
                  onClick={() => handleQuickAdd(preset)}
                  disabled={isSaving}
                >
                  <Plus className="w-4 h-4 mr-2 text-primary" />
                  <span className="text-left flex-1">{preset.name}</span>
                  <span className="text-muted-foreground">{preset.defaultValue}%</span>
                </Button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Cost List */}
      <div className="space-y-3 mb-4">
        <AnimatePresence mode="popLayout">
          {variableCosts.map((cost) => (
            <motion.div
              key={cost.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 rounded-lg bg-secondary/50 border border-border"
            >
              {editingId === cost.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome do custo</Label>
                      <Input
                        value={editCost.name}
                        onChange={(e) => setEditCost({ ...editCost, name: e.target.value })}
                        placeholder="Nome do custo"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={editCost.cost_type}
                          onValueChange={(v) => setEditCost({ ...editCost, cost_type: v as 'percentage' | 'fixed' })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentual (%)</SelectItem>
                            <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Valor</Label>
                        <Input
                          type="number"
                          value={editCost.value || ""}
                          onChange={(e) => setEditCost({ ...editCost, value: parseFloat(e.target.value) || 0 })}
                          className="mt-1"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      cost.cost_type === 'percentage' 
                        ? "bg-primary/10 text-primary" 
                        : "bg-orange-500/10 text-orange-500"
                    )}>
                      {cost.cost_type === 'percentage' ? (
                        <Percent className="w-5 h-5" />
                      ) : (
                        <DollarSign className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{cost.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {cost.cost_type === 'percentage' 
                          ? `${cost.value}% do faturamento`
                          : `${formatCurrency(cost.value)}/mês`}
                        {cost.cost_type === 'fixed' && monthlyRevenue > 0 && (
                          <span className="ml-1 text-xs">
                            (≈ {((cost.value / monthlyRevenue) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartEdit(cost)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cost.id)}
                      disabled={isSaving}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add New Cost Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-lg bg-secondary/30 border border-border mb-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Nome ou descrição do custo</Label>
                  <Input
                    value={newCost.name}
                    onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
                    placeholder="Ex: Comissão, Taxa de cartão..."
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Tipo de cálculo</Label>
                  <Select
                    value={newCost.cost_type}
                    onValueChange={(v) => setNewCost({ ...newCost, cost_type: v as 'percentage' | 'fixed' })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4" />
                          Percentual sobre faturamento
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Valor fixo mensal
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>
                    {newCost.cost_type === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'}
                  </Label>
                  <Input
                    type="number"
                    value={newCost.value || ""}
                    onChange={(e) => setNewCost({ ...newCost, value: parseFloat(e.target.value) || 0 })}
                    placeholder={newCost.cost_type === 'percentage' ? "Ex: 10" : "Ex: 500"}
                    className="mt-1.5"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCost({ name: "", cost_type: "percentage", value: 0, description: "" });
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddCost}
                  disabled={isSaving || !newCost.name.trim() || newCost.value <= 0}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Button */}
      {!showAddForm && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Custo Variável
        </Button>
      )}

      {/* Tip about estimation */}
      {variableCosts.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Não sabe o valor exato? Comece com estimativas e ajuste conforme 
            você acompanha seus gastos reais. O importante é ter uma visão inicial dos seus custos.
          </p>
        </div>
      )}
    </motion.div>
  );
}
