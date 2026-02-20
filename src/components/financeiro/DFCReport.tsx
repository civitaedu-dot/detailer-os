import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Info } from "lucide-react";
import { type FinancialEntry } from "@/hooks/useFinancialEntries";
import { type FixedCost } from "@/hooks/useFixedCosts";
import { type VariableCost } from "@/hooks/useVariableCosts";

interface DFCReportProps {
  entries: FinancialEntry[];
  fixedCosts: FixedCost[];
  variableCosts: VariableCost[];
  monthlyRevenue: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function DFCReport({ entries, fixedCosts, variableCosts, monthlyRevenue }: DFCReportProps) {
  const data = useMemo(() => {
    // --- ENTRADAS ---
    const cashInItems = entries.map((e) => ({
      description: e.description,
      value: Number(e.value),
      date: e.entry_date,
      type: e.is_automatic ? "Agenda" : "Manual",
    }));
    const totalCashIn = cashInItems.reduce((s, i) => s + i.value, 0);

    // --- SAÍDAS: Custos Fixos ativos ---
    const fixedOutItems = fixedCosts
      .filter((c) => c.is_active)
      .map((c) => ({
        description: c.name,
        value: c.value,
        category: "Custo Fixo" as const,
      }));
    const totalFixedOut = fixedOutItems.reduce((s, i) => s + i.value, 0);

    // --- SAÍDAS: Custos Variáveis calculados ---
    const variableOutItems = variableCosts.map((c) => {
      const amount =
        c.cost_type === "percentage"
          ? (c.value / 100) * monthlyRevenue
          : c.value;
      return {
        description: c.name,
        value: amount,
        category: "Custo Variável" as const,
      };
    });
    const totalVariableOut = variableOutItems.reduce((s, i) => s + i.value, 0);

    const totalCashOut = totalFixedOut + totalVariableOut;
    const netCashFlow = totalCashIn - totalCashOut;

    return {
      cashInItems,
      totalCashIn,
      fixedOutItems,
      variableOutItems,
      totalFixedOut,
      totalVariableOut,
      totalCashOut,
      netCashFlow,
    };
  }, [entries, fixedCosts, variableCosts, monthlyRevenue]);

  const hasData = data.totalCashIn > 0 || data.totalCashOut > 0;

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h2 className="font-display text-xl font-bold mb-4">DFC – Demonstrativo de Fluxo de Caixa</h2>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Registre movimentações financeiras para visualizar o fluxo de caixa do período.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total de Entradas"
          value={data.totalCashIn}
          icon={ArrowUpCircle}
          colorClass="text-success"
          bgClass="bg-success/10 border-success/30"
        />
        <SummaryCard
          label="Total de Saídas"
          value={data.totalCashOut}
          icon={ArrowDownCircle}
          colorClass="text-destructive"
          bgClass="bg-destructive/10 border-destructive/30"
        />
        <SummaryCard
          label="Fluxo Líquido"
          value={data.netCashFlow}
          icon={Wallet}
          colorClass={data.netCashFlow >= 0 ? "text-success" : "text-destructive"}
          bgClass={data.netCashFlow >= 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}
        />
      </div>

      {/* Detail sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entradas */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-success" />
            <h3 className="font-display font-bold text-lg">Entradas de Caixa</h3>
          </div>
          {data.cashInItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma entrada no período.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {data.cashInItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date + "T00:00:00").toLocaleDateString("pt-BR")} · {item.type}
                    </p>
                  </div>
                  <span className="font-display font-semibold text-success">
                    +{formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
            <span className="font-medium text-sm">Total Entradas</span>
            <span className="font-display font-bold text-success">{formatCurrency(data.totalCashIn)}</span>
          </div>
        </div>

        {/* Saídas */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-destructive" />
            <h3 className="font-display font-bold text-lg">Saídas de Caixa</h3>
          </div>

          {/* Custos Fixos */}
          {data.fixedOutItems.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Custos Fixos</p>
              <div className="space-y-2 mb-4">
                {data.fixedOutItems.map((item, i) => (
                  <div key={`f-${i}`} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm font-medium">{item.description}</p>
                    <span className="font-display font-semibold text-destructive">
                      -{formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Custos Variáveis */}
          {data.variableOutItems.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Custos Variáveis</p>
              <div className="space-y-2 mb-4">
                {data.variableOutItems.map((item, i) => (
                  <div key={`v-${i}`} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm font-medium">{item.description}</p>
                    <span className="font-display font-semibold text-destructive">
                      -{formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {data.fixedOutItems.length === 0 && data.variableOutItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma saída cadastrada.</p>
          )}

          <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
            <span className="font-medium text-sm">Total Saídas</span>
            <span className="font-display font-bold text-destructive">{formatCurrency(data.totalCashOut)}</span>
          </div>
        </div>
      </div>

      {/* Result bar */}
      <div
        className={`p-5 rounded-xl border-2 flex items-center justify-between ${
          data.netCashFlow >= 0
            ? "bg-success/10 border-success/30"
            : "bg-destructive/10 border-destructive/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <Wallet className={`w-6 h-6 ${data.netCashFlow >= 0 ? "text-success" : "text-destructive"}`} />
          <div>
            <p className="font-display font-bold text-lg">Resultado do Período</p>
            <p className="text-xs text-muted-foreground">Entradas – Saídas = Fluxo de Caixa Líquido</p>
          </div>
        </div>
        <span className={`font-display font-bold text-2xl ${data.netCashFlow >= 0 ? "text-success" : "text-destructive"}`}>
          {formatCurrency(data.netCashFlow)}
        </span>
      </div>

      {/* Educational note */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">DFC vs DRE:</strong> A DRE mostra o resultado econômico (competência), enquanto o DFC mostra a movimentação real de caixa (entradas e saídas efetivas de dinheiro). Ambos são complementares para a gestão financeira.
        </p>
      </div>
    </motion.div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${bgClass}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${colorClass}`} />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={`font-display font-bold text-xl ${colorClass}`}>{formatCurrency(value)}</p>
    </motion.div>
  );
}
