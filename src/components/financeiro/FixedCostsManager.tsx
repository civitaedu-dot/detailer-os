import { useState } from "react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Trash2, 
  Info, 
  Building2,
  Edit2,
  Check,
  X,
  Loader2,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFixedCosts, FixedCost, FixedCostInput } from "@/hooks/useFixedCosts";
import { cn } from "@/lib/utils";

interface FixedCostsManagerProps {
  onTotalChange: (total: number) => void;
}

const COMMON_FIXED_COSTS = [
  { name: "Aluguel", defaultValue: 2000 },
  { name: "Salário (funcionários)", defaultValue: 3000 },
  { name: "Pró-labore", defaultValue: 5000 },
  { name: "Energia elétrica", defaultValue: 500 },
  { name: "Água", defaultValue: 150 },
  { name: "Internet", defaultValue: 200 },
  { name: "Telefone", defaultValue: 100 },
  { name: "Sistema/Software", defaultValue: 150 },
  { name: "Contador", defaultValue: 500 },
  { name: "IPTU", defaultValue: 200 },
];

export function FixedCostsManager({ onTotalChange }: FixedCostsManagerProps) {
  const { 
    fixedCosts, 
    isLoading, 
    isSaving, 
    addFixedCost, 
    updateFixedCost, 
    deleteFixedCost,
    toggleFixedCost,
    calculateTotalFixedCosts 
  } = useFixedCosts();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  
  // Form state
  const [newCost, setNewCost] = useState<FixedCostInput>({
    name: "",
    value: 0,
    description: "",
  });

  const [editCost, setEditCost] = useState<FixedCostInput>({
    name: "",
    value: 0,
    description: "",
  });

  const totalFixedCosts = calculateTotalFixedCosts();

  // Notify parent of total changes
  const handleTotalChange = () => {
    onTotalChange(calculateTotalFixedCosts());
  };

  const handleAddCost = async () => {
    if (!newCost.name.trim() || newCost.value <= 0) return;
    
    await addFixedCost(newCost);
    setNewCost({ name: "", value: 0, description: "" });
    setShowAddForm(false);
    handleTotalChange();
  };

  const handleQuickAdd = async (preset: typeof COMMON_FIXED_COSTS[0]) => {
    await addFixedCost({
      name: preset.name,
      value: preset.defaultValue,
    });
    handleTotalChange();
  };

  const handleStartEdit = (cost: FixedCost) => {
    setEditingId(cost.id);
    setEditCost({
      name: cost.name,
      value: cost.value,
      description: cost.description,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editCost.name.trim() || editCost.value <= 0) return;
    
    await updateFixedCost(editingId, editCost);
    setEditingId(null);
    handleTotalChange();
  };

  const handleDelete = async (id: string) => {
    await deleteFixedCost(id);
    handleTotalChange();
  };

  const handleToggle = async (id: string) => {
    await toggleFixedCost(id);
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
      transition={{ delay: 0.1 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold">Custos Fixos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Despesas mensais que não variam com o faturamento
          </p>
        </div>
      </div>

      {/* Educational Section */}
      <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              <strong>Custos fixos</strong> são despesas que você paga todo mês, 
              independente de quantos serviços realizar. Eles existem mesmo que você não venda nada.
            </p>
            <Collapsible open={isHelpOpen} onOpenChange={setIsHelpOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-amber-600 p-0 h-auto">
                  <HelpCircle className="w-4 h-4 mr-1" />
                  Ver exemplos comuns
                  <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", isHelpOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                  <li><strong>Aluguel:</strong> valor fixo mensal do espaço</li>
                  <li><strong>Salários:</strong> pagamento de funcionários fixos</li>
                  <li><strong>Pró-labore:</strong> sua retirada mensal fixa</li>
                  <li><strong>Contas:</strong> energia, água, internet, telefone</li>
                  <li><strong>Serviços:</strong> contador, sistemas, seguros</li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>

      {/* Total Summary Card */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total de Custos Fixos</p>
            <p className="text-3xl font-bold text-amber-600">{formatCurrency(totalFixedCosts)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Itens ativos</p>
            <p className="text-lg font-semibold">
              {fixedCosts.filter(c => c.is_active).length} de {fixedCosts.length}
            </p>
          </div>
        </div>
        {fixedCosts.length === 0 && (
          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-amber-500/20">
            Adicione seus custos fixos abaixo para um cálculo preciso.
          </p>
        )}
      </div>

      {/* Quick Add Presets */}
      {fixedCosts.length === 0 && (
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
              {COMMON_FIXED_COSTS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="ghost"
                  size="sm"
                  className="justify-start h-auto py-2 px-3"
                  onClick={() => handleQuickAdd(preset)}
                  disabled={isSaving}
                >
                  <Plus className="w-4 h-4 mr-2 text-amber-500" />
                  <span className="text-left flex-1">{preset.name}</span>
                  <span className="text-muted-foreground">{formatCurrency(preset.defaultValue)}</span>
                </Button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Cost List */}
      <div className="space-y-3 mb-4">
        <AnimatePresence mode="popLayout">
          {fixedCosts.map((cost) => (
            <motion.div
              key={cost.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "p-4 rounded-lg border transition-all",
                cost.is_active 
                  ? "bg-secondary/50 border-border" 
                  : "bg-muted/30 border-muted opacity-60"
              )}
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
                    <div>
                      <Label className="text-xs">Valor mensal (R$)</Label>
                      <Input
                        type="number"
                        value={editCost.value || ""}
                        onChange={(e) => setEditCost({ ...editCost, value: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                        min="0"
                        step="0.01"
                      />
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
                      cost.is_active 
                        ? "bg-amber-500/10 text-amber-500" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium",
                        !cost.is_active && "line-through text-muted-foreground"
                      )}>
                        {cost.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(cost.value)}/mês
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cost.is_active}
                      onCheckedChange={() => handleToggle(cost.id)}
                      disabled={isSaving}
                    />
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
                  <Label>Nome do custo fixo</Label>
                  <Input
                    value={newCost.name}
                    onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
                    placeholder="Ex: Aluguel, Salário, Internet..."
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Valor mensal (R$)</Label>
                  <Input
                    type="number"
                    value={newCost.value || ""}
                    onChange={(e) => setNewCost({ ...newCost, value: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 2000"
                    className="mt-1.5"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCost({ name: "", value: 0, description: "" });
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
          Adicionar Custo Fixo
        </Button>
      )}
    </motion.div>
  );
}
