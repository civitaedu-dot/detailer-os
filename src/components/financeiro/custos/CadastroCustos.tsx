import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  Building2,
  Users,
  Megaphone,
  Package,
  Cpu,
  Truck,
  Receipt,
  Wrench,
  MoreHorizontal,
  HelpCircle,
  Copy,
  TrendingDown,
  TrendingUp,
  Info,
} from "lucide-react";
import { useFixedCosts, FixedCost, FixedCostInput } from "@/hooks/useFixedCosts";
import { useVariableCosts, VariableCost, VariableCostInput } from "@/hooks/useVariableCosts";
import { cn } from "@/lib/utils";

interface CadastroCustosProps {
  monthlyRevenue: number;
  onFixedChange: (total: number) => void;
  onVariableChange: (pct: number) => void;
}

const CATEGORIES = [
  { value: "infraestrutura", label: "Infraestrutura", icon: Building2, color: "text-blue-400", bg: "bg-blue-500/10" },
  { value: "pessoal", label: "Pessoal", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
  { value: "marketing", label: "Marketing e Vendas", icon: Megaphone, color: "text-amber-400", bg: "bg-amber-500/10" },
  { value: "producao", label: "Produção", icon: Package, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { value: "tecnologia", label: "Tecnologia", icon: Cpu, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { value: "logistica", label: "Logística", icon: Truck, color: "text-orange-400", bg: "bg-orange-500/10" },
  { value: "impostos", label: "Impostos e Taxas", icon: Receipt, color: "text-red-400", bg: "bg-red-500/10" },
  { value: "servicos", label: "Serviços Terceirizados", icon: Wrench, color: "text-pink-400", bg: "bg-pink-500/10" },
  { value: "outros", label: "Outros", icon: MoreHorizontal, color: "text-muted-foreground", bg: "bg-secondary" },
];

const SUBCATEGORIES: Record<string, string[]> = {
  infraestrutura: ["Aluguel", "Energia Elétrica", "Água e Saneamento", "Telefone", "Internet", "IPTU", "Condomínio"],
  pessoal: ["Salários CLT", "Pró-labore", "Comissões", "Benefícios", "FGTS", "INSS Patronal", "Férias", "13º Salário"],
  marketing: ["Publicidade Online", "Material Impresso", "Evento", "CRM", "Representante Comercial"],
  producao: ["Matéria-Prima", "Embalagens", "Insumos", "Equipamentos"],
  tecnologia: ["Software/SaaS", "Hardware", "Licenças", "Suporte Técnico", "Hospedagem"],
  logistica: ["Frete", "Combustível", "Manutenção de Veículos", "Pedágio"],
  impostos: ["ISS", "ICMS", "Simples Nacional", "IRPJ", "CSLL", "DAS"],
  servicos: ["Contador", "Advocacia", "Consultoria", "Limpeza", "Segurança"],
  outros: ["Outros"],
};

const COST_TYPE_INFO = {
  fixed: {
    title: "Custo Fixo",
    desc: "Existe todo mês, independente de quanto você vende ou produz. Ex: aluguel, salários, internet.",
    color: "border-blue-500/30 bg-blue-500/5",
    textColor: "text-blue-400",
    icon: <Building2 className="w-4 h-4" />,
  },
  variable: {
    title: "Custo Variável",
    desc: "Aumenta quando você vende/produz mais e reduz quando vende menos. Ex: comissões, matéria-prima.",
    color: "border-amber-500/30 bg-amber-500/5",
    textColor: "text-amber-400",
    icon: <TrendingUp className="w-4 h-4" />,
  },
};

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function CategoryIcon({ category }: { category: string }) {
  const cat = CATEGORIES.find((c) => c.value === category);
  if (!cat) return <MoreHorizontal className="w-4 h-4" />;
  const Icon = cat.icon;
  return (
    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", cat.bg, cat.color)}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

function CostTypeSelector({ value, onChange }: { value: "fixed" | "variable"; onChange: (v: "fixed" | "variable") => void }) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Tipo de Custo</Label>
        <button onClick={() => setShowHelp(!showHelp)} className="text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["fixed", "variable"] as const).map((type) => {
          const info = COST_TYPE_INFO[type];
          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-all",
                value === type ? info.color + " " + info.textColor : "border-border bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={value === type ? info.textColor : "text-muted-foreground"}>{info.icon}</div>
                <span className="font-semibold text-sm">{info.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-tight">{info.desc}</p>
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-secondary/50 border border-border rounded-xl text-sm space-y-3">
              <div>
                <p className="font-semibold text-blue-400 mb-1">🏢 Custos Fixos (Azul)</p>
                <p className="text-muted-foreground">Aluguel, salários CLT, pró-labore, internet, contador, softwares, seguros. Sempre presentes, mesmo sem vendas.</p>
              </div>
              <div>
                <p className="font-semibold text-amber-400 mb-1">📈 Custos Variáveis (Laranja)</p>
                <p className="text-muted-foreground">Comissões, matéria-prima, embalagens, fretes, taxas de cartão e marketplace, impostos sobre vendas. Crescem com o faturamento.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ExtendedFixedCostInput extends FixedCostInput {
  category?: string;
  subcategory?: string;
  department?: string;
  frequency?: string;
}

interface ExtendedVariableCostInput extends VariableCostInput {
  category?: string;
  subcategory?: string;
  min_value?: number;
  max_value?: number;
  variation_factor?: string;
}

export function CadastroCustos({ monthlyRevenue, onFixedChange, onVariableChange }: CadastroCustosProps) {
  const { fixedCosts, isSaving: isSavingFixed, addFixedCost, updateFixedCost, deleteFixedCost, toggleFixedCost, calculateTotalFixedCosts } = useFixedCosts();
  const { variableCosts, isSaving: isSavingVariable, addVariableCost, updateVariableCost, deleteVariableCost, calculateTotalPercentage } = useVariableCosts();

  const isSaving = isSavingFixed || isSavingVariable;

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "fixed" | "variable">("all");

  const [costType, setCostType] = useState<"fixed" | "variable">("fixed");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [name, setName] = useState("");
  const [value, setValue] = useState<number | "">("");
  const [varType, setVarType] = useState<"percentage" | "fixed">("percentage");
  const [description, setDescription] = useState("");
  const [variationFactor, setVariationFactor] = useState("");

  const resetForm = () => {
    setName(""); setValue(""); setCategory(""); setSubcategory("");
    setDescription(""); setVariationFactor(""); setVarType("percentage");
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!name.trim() || !value) return;
    if (costType === "fixed") {
      await addFixedCost({ name, value: Number(value), description: description || `${category} - ${subcategory}` });
      onFixedChange(calculateTotalFixedCosts());
    } else {
      await addVariableCost({ name, cost_type: varType, value: Number(value), description: variationFactor || description });
      onVariableChange(calculateTotalPercentage(monthlyRevenue));
    }
    resetForm();
    setShowAddForm(false);
  };

  const handleDelete = async (id: string, type: "fixed" | "variable") => {
    if (type === "fixed") { await deleteFixedCost(id); onFixedChange(calculateTotalFixedCosts()); }
    else { await deleteVariableCost(id); onVariableChange(calculateTotalPercentage(monthlyRevenue)); }
  };

  const allItems = [
    ...fixedCosts.map(c => ({ ...c, type: "fixed" as const })),
    ...variableCosts.map(c => ({ ...c, type: "variable" as const })),
  ];

  const filtered = activeTab === "all" ? allItems : allItems.filter(c => c.type === activeTab);

  const totalFixed = calculateTotalFixedCosts();
  const totalVarValue = variableCosts.reduce((s, c) => s + (c.cost_type === "percentage" ? (monthlyRevenue * c.value) / 100 : c.value), 0);

  return (
    <div className="space-y-6">
      {/* Totals row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400 font-medium">Custos Fixos</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{fmt(totalFixed)}</p>
          <p className="text-xs text-muted-foreground mt-1">{fixedCosts.filter(c => c.is_active).length} itens ativos</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400 font-medium">Custos Variáveis</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{fmt(totalVarValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{variableCosts.length} itens</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Total Geral</span>
          </div>
          <p className="text-2xl font-bold">{fmt(totalFixed + totalVarValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {monthlyRevenue > 0 ? `${(((totalFixed + totalVarValue) / monthlyRevenue) * 100).toFixed(1)}% do faturamento` : "sem faturamento"}
          </p>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border rounded-xl p-5 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Novo Custo</h3>
              <button onClick={() => { resetForm(); setShowAddForm(false); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <CostTypeSelector value={costType} onChange={setCostType} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nome / Descrição do Custo</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Aluguel do espaço, Comissão de vendas..." className="mt-1.5" />
              </div>

              <div>
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="w-4 h-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {category && (
                <div>
                  <Label>Subcategoria</Label>
                  <Select value={subcategory} onValueChange={setSubcategory}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(SUBCATEGORIES[category] || []).map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {costType === "variable" && (
                <div>
                  <Label>Tipo de Cálculo</Label>
                  <Select value={varType} onValueChange={(v) => setVarType(v as "percentage" | "fixed")}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual sobre faturamento (%)</SelectItem>
                      <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>{costType === "fixed" ? "Valor Mensal (R$)" : varType === "percentage" ? "Percentual (%)" : "Valor (R$)"}</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={value} onChange={e => setValue(parseFloat(e.target.value) || "")}
                  placeholder={costType === "fixed" ? "Ex: 2000" : varType === "percentage" ? "Ex: 10" : "Ex: 500"}
                  className="mt-1.5"
                />
                {costType === "variable" && varType === "percentage" && value && monthlyRevenue > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ {fmt((monthlyRevenue * Number(value)) / 100)} sobre o faturamento atual
                  </p>
                )}
              </div>

              {costType === "variable" && (
                <div className="sm:col-span-2">
                  <Label>Fator de Variação <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Input
                    value={variationFactor}
                    onChange={e => setVariationFactor(e.target.value)}
                    placeholder="Ex: varia conforme número de pedidos, faturamento do mês..."
                    className="mt-1.5"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <Label>Observações <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes adicionais..." className="mt-1.5 resize-none" rows={2} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => { resetForm(); setShowAddForm(false); }}>Cancelar</Button>
              <Button
                onClick={handleAdd}
                disabled={isSaving || !name.trim() || !value}
                className={costType === "fixed" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar {costType === "fixed" ? "Custo Fixo" : "Custo Variável"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter + Add Button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "fixed", "variable"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab
                  ? tab === "fixed" ? "bg-blue-600 text-white" : tab === "variable" ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {tab === "all" ? "Todos" : tab === "fixed" ? "Fixos" : "Variáveis"}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Custo
            </Button>
          )}
        </div>
      </div>

      {/* Cost List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
              <TrendingDown className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-sm">Nenhum custo cadastrado ainda.</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar primeiro custo
              </Button>
            </motion.div>
          ) : (
            filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border transition-all",
                  item.type === "fixed"
                    ? "bg-blue-500/3 border-blue-500/15 hover:border-blue-500/30"
                    : "bg-amber-500/3 border-amber-500/15 hover:border-amber-500/30",
                  item.type === "fixed" && "is_active" in item && !(item as FixedCost).is_active && "opacity-50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  item.type === "fixed" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
                )}>
                  {item.type === "fixed" ? <Building2 className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.type === "fixed"
                      ? fmt(item.value) + "/mês"
                      : (item as VariableCost).cost_type === "percentage"
                        ? `${item.value}% do faturamento · ${monthlyRevenue > 0 ? fmt((monthlyRevenue * item.value) / 100) : "—"}`
                        : fmt(item.value) + "/mês"}
                  </p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{item.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.type === "fixed" && (
                    <Switch
                      checked={(item as FixedCost).is_active}
                      onCheckedChange={() => { toggleFixedCost(item.id); onFixedChange(calculateTotalFixedCosts()); }}
                      disabled={isSaving}
                    />
                  )}
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                    onClick={async () => {
                      if (item.type === "fixed") {
                        await addFixedCost({ name: item.name + " (cópia)", value: item.value, description: item.description });
                        onFixedChange(calculateTotalFixedCosts());
                      }
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id, item.type)}
                    disabled={isSaving}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
