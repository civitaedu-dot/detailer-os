import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, PlusCircle, CalendarClock, BookOpen,
  Bell, TrendingDown, TrendingUp, AlertTriangle, Zap, ArrowRight, Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFixedCosts } from "@/hooks/useFixedCosts";
import { useVariableCosts } from "@/hooks/useVariableCosts";
import { CustosDashboard } from "./custos/CustosDashboard";
import { CadastroCustos } from "./custos/CadastroCustos";
import { PrevisibilidadeCustos } from "./custos/PrevisibilidadeCustos";
import { CentralConhecimento } from "./custos/CentralConhecimento";
import { cn } from "@/lib/utils";

interface GestaoCompletaCustosProps {
  monthlyRevenue: number;
  onFixedChange: (total: number) => void;
  onVariableChange: (pct: number) => void;
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Visão geral e indicadores" },
  { id: "cadastro", label: "Cadastrar Custos", icon: PlusCircle, desc: "Adicionar e gerenciar" },
  { id: "previsao", label: "Previsibilidade", icon: CalendarClock, desc: "Projeções e cenários" },
  { id: "central", label: "Central de Conhecimento", icon: BookOpen, desc: "Aprenda e descubra custos" },
];

export function GestaoCompletaCustos({ monthlyRevenue, onFixedChange, onVariableChange }: GestaoCompletaCustosProps) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPrefill, setAddPrefill] = useState<{ category?: string; type?: "fixed" | "variable"; name?: string } | undefined>();

  const { fixedCosts, calculateTotalFixedCosts, refetch: refetchFixed } = useFixedCosts();
  const { variableCosts, calculateTotalPercentage, refetch: refetchVar } = useVariableCosts();

  const totalFixed = useMemo(() => calculateTotalFixedCosts(), [calculateTotalFixedCosts]);
  const totalVarValue = useMemo(() => {
    return variableCosts.reduce((sum, cost) => {
      if (cost.cost_type === "percentage") return sum + (monthlyRevenue * cost.value) / 100;
      return sum + cost.value;
    }, 0);
  }, [variableCosts, monthlyRevenue]);

  const totalCosts = totalFixed + totalVarValue;

  const insights = useMemo(() => {
    const msgs: { type: "warning" | "info" | "success"; text: string; action?: string; actionSection?: string }[] = [];

    if (fixedCosts.length === 0) {
      msgs.push({ type: "info", text: "Nenhum custo fixo cadastrado. Comece adicionando aluguel, salários e contas fixas.", action: "Cadastrar agora", actionSection: "cadastro" });
    }
    if (variableCosts.length === 0) {
      msgs.push({ type: "info", text: "Sem custos variáveis? Lembre-se de taxas de cartão, comissões e insumos.", action: "Adicionar variáveis", actionSection: "cadastro" });
    }
    if (monthlyRevenue > 0 && totalCosts > 0) {
      const ratio = totalCosts / monthlyRevenue;
      if (ratio > 0.8) msgs.push({ type: "warning", text: `Seus custos representam ${(ratio * 100).toFixed(0)}% do faturamento. Margem muito apertada — revise sua estrutura.` });
      else if (ratio < 0.4) msgs.push({ type: "success", text: `Excelente! Seus custos são apenas ${(ratio * 100).toFixed(0)}% do faturamento. Margem saudável.` });
    }
    if (fixedCosts.length > 0 && variableCosts.length === 0) {
      msgs.push({ type: "info", text: "Você tem custos fixos mas nenhum variável. Verifique se há taxas de cartão ou comissões para cadastrar.", action: "Ver guia", actionSection: "central" });
    }

    return msgs.slice(0, 3);
  }, [fixedCosts, variableCosts, monthlyRevenue, totalCosts]);

  const handleAddFromCentral = (prefill?: { category?: string; type?: "fixed" | "variable"; name?: string }) => {
    setAddPrefill(prefill);
    setActiveSection("cadastro");
    setShowAddForm(true);
  };

  const handleFixedChange = () => {
    refetchFixed();
    onFixedChange(calculateTotalFixedCosts());
  };

  const handleVariableChange = () => {
    refetchVar();
    onVariableChange(calculateTotalPercentage(monthlyRevenue));
  };

  return (
    <div className="space-y-4">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-destructive" />
            Gestão de Custos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fixedCosts.length + variableCosts.length} custo{fixedCosts.length + variableCosts.length !== 1 ? "s" : ""} cadastrado{fixedCosts.length + variableCosts.length !== 1 ? "s" : ""}
            {" · "}
            <span className="text-blue-400">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalFixed)} fixo</span>
            {" + "}
            <span className="text-amber-400">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalVarValue)} variável</span>
          </p>
        </div>
        <Button onClick={() => { setActiveSection("cadastro"); setShowAddForm(true); }} size="sm">
          <PlusCircle className="w-4 h-4 mr-2" />
          Novo Custo
        </Button>
      </div>

      {/* Intelligent Insights */}
      <AnimatePresence>
        {insights.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            {insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
                  insight.type === "warning" ? "bg-amber-500/5 border-amber-500/20" :
                  insight.type === "success" ? "bg-primary/5 border-primary/20" :
                  "bg-secondary/50 border-border"
                )}
              >
                {insight.type === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> :
                 insight.type === "success" ? <Zap className="w-4 h-4 text-primary shrink-0" /> :
                 <Lightbulb className="w-4 h-4 text-blue-400 shrink-0" />}
                <p className="flex-1 text-muted-foreground">{insight.text}</p>
                {insight.action && (
                  <button
                    onClick={() => insight.actionSection && setActiveSection(insight.actionSection)}
                    className="text-xs font-medium text-primary flex items-center gap-1 shrink-0 hover:underline"
                  >
                    {insight.action} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Internal Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 border",
                activeSection === item.id
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <AnimatePresence mode="wait">
        {activeSection === "dashboard" && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CustosDashboard
              fixedCosts={fixedCosts}
              variableCosts={variableCosts}
              monthlyRevenue={monthlyRevenue}
            />
          </motion.div>
        )}

        {activeSection === "cadastro" && (
          <motion.div key="cadastro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CadastroCustos
              monthlyRevenue={monthlyRevenue}
              onFixedChange={onFixedChange}
              onVariableChange={onVariableChange}
            />
          </motion.div>
        )}

        {activeSection === "previsao" && (
          <motion.div key="previsao" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PrevisibilidadeCustos
              fixedCosts={fixedCosts}
              variableCosts={variableCosts}
              monthlyRevenue={monthlyRevenue}
            />
          </motion.div>
        )}

        {activeSection === "central" && (
          <motion.div key="central" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CentralConhecimento onAddCost={handleAddFromCentral} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
