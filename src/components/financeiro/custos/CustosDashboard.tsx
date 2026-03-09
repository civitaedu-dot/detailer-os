import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import {
  TrendingDown, Building2, Users, Cpu, Megaphone,
  Package, Truck, Receipt, Wrench, MoreHorizontal,
  AlertCircle, Target, TrendingUp, Calendar
} from "lucide-react";
import { FixedCost } from "@/hooks/useFixedCosts";
import { VariableCost } from "@/hooks/useVariableCosts";

interface CustosDashboardProps {
  fixedCosts: FixedCost[];
  variableCosts: VariableCost[];
  monthlyRevenue: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Infraestrutura": "#3b82f6",
  "Pessoal": "#8b5cf6",
  "Marketing": "#f59e0b",
  "Produção": "#10b981",
  "Tecnologia": "#06b6d4",
  "Logística": "#f97316",
  "Impostos": "#ef4444",
  "Serviços": "#ec4899",
  "Manutenção": "#84cc16",
  "Outros": "#6b7280",
  "Custos Fixos": "#3b82f6",
  "Custos Variáveis": "#f97316",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Infraestrutura": <Building2 className="w-4 h-4" />,
  "Pessoal": <Users className="w-4 h-4" />,
  "Marketing": <Megaphone className="w-4 h-4" />,
  "Produção": <Package className="w-4 h-4" />,
  "Tecnologia": <Cpu className="w-4 h-4" />,
  "Logística": <Truck className="w-4 h-4" />,
  "Impostos": <Receipt className="w-4 h-4" />,
  "Serviços": <Wrench className="w-4 h-4" />,
  "Manutenção": <Wrench className="w-4 h-4" />,
  "Outros": <MoreHorizontal className="w-4 h-4" />,
};

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; value: number; items?: Array<{ name: string; value: number }> } }>;
}

const CustomPieTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{d.name}</p>
      <p className="text-primary">{fmt(d.value)}</p>
      {d.payload.items?.slice(0, 4).map((item) => (
        <p key={item.name} className="text-muted-foreground text-xs mt-1">
          • {item.name}: {fmt(item.value)}
        </p>
      ))}
    </div>
  );
};

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}

const CustomBarTooltip = ({ active, payload, label }: BarTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{fmt(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-border mt-2 pt-2 font-semibold">
        Total: {fmt(payload.reduce((s, p) => s + p.value, 0))}
      </div>
    </div>
  );
};

export function CustosDashboard({ fixedCosts, variableCosts, monthlyRevenue }: CustosDashboardProps) {
  const [activePieSlice, setActivePieSlice] = useState<string | null>(null);

  const totalFixed = useMemo(
    () => fixedCosts.filter((c) => c.is_active).reduce((s, c) => s + c.value, 0),
    [fixedCosts]
  );

  const totalVariableValue = useMemo(() => {
    return variableCosts.reduce((sum, cost) => {
      if (cost.cost_type === "percentage") return sum + (monthlyRevenue * cost.value) / 100;
      return sum + cost.value;
    }, 0);
  }, [variableCosts, monthlyRevenue]);

  const totalCosts = totalFixed + totalVariableValue;
  const dailyAvg = totalCosts / 22;
  const costsOverRevenue = monthlyRevenue > 0 ? (totalCosts / monthlyRevenue) * 100 : 0;

  // Pie chart data: fixed vs variable breakdown
  const pieData = useMemo(() => {
    const segments = [
      { name: "Custos Fixos", value: totalFixed, items: fixedCosts.filter(c => c.is_active).map(c => ({ name: c.name, value: c.value })) },
      { name: "Custos Variáveis", value: totalVariableValue, items: variableCosts.map(c => ({ name: c.name, value: c.cost_type === "percentage" ? (monthlyRevenue * c.value) / 100 : c.value })) },
    ].filter(s => s.value > 0);
    return segments;
  }, [totalFixed, totalVariableValue, fixedCosts, variableCosts, monthlyRevenue]);

  // Bar chart: simulate last 6 months with slight variation
  const barData = useMemo(() => {
    const months = ["Out", "Nov", "Dez", "Jan", "Fev", "Mar"];
    return months.map((month, i) => {
      const variation = 0.85 + Math.sin(i) * 0.15;
      return {
        month,
        "Custos Fixos": Math.round(totalFixed * variation),
        "Custos Variáveis": Math.round(totalVariableValue * variation),
      };
    });
  }, [totalFixed, totalVariableValue]);

  // Ranking
  const allCostItems = useMemo(() => {
    const items = [
      ...fixedCosts.filter(c => c.is_active).map(c => ({ name: c.name, value: c.value, type: "fixed" as const })),
      ...variableCosts.map(c => ({
        name: c.name,
        value: c.cost_type === "percentage" ? (monthlyRevenue * c.value) / 100 : c.value,
        type: "variable" as const,
      })),
    ];
    return items.sort((a, b) => b.value - a.value).slice(0, 8);
  }, [fixedCosts, variableCosts, monthlyRevenue]);

  const kpis = [
    {
      label: "Total de Custos",
      value: fmt(totalCosts),
      icon: <TrendingDown className="w-5 h-5" />,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Custos Fixos",
      value: fmt(totalFixed),
      icon: <Building2 className="w-5 h-5" />,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Custos Variáveis",
      value: fmt(totalVariableValue),
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Custo Médio Diário",
      value: fmt(dailyAvg),
      icon: <Calendar className="w-5 h-5" />,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "% sobre Faturamento",
      value: monthlyRevenue > 0 ? `${costsOverRevenue.toFixed(1)}%` : "—",
      icon: <Target className="w-5 h-5" />,
      color: costsOverRevenue > 70 ? "text-destructive" : costsOverRevenue > 50 ? "text-amber-400" : "text-primary",
      bg: "bg-secondary",
    },
    {
      label: "Previsão Próx. Mês",
      value: fmt(totalCosts * 1.02),
      icon: <AlertCircle className="w-5 h-5" />,
      color: "text-muted-foreground",
      bg: "bg-secondary",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className={`w-9 h-9 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center mb-3`}>
              {kpi.icon}
            </div>
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="font-semibold text-base mb-4">Distribuição de Custos</h3>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Nenhum custo cadastrado ainda
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={(d) => setActivePieSlice(activePieSlice === d.name ? null : d.name)}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[entry.name] || "#6b7280"}
                          opacity={activePieSlice && activePieSlice !== entry.name ? 0.4 : 1}
                          style={{ cursor: "pointer" }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 w-full">
                {pieData.map((entry) => (
                  <button
                    key={entry.name}
                    onClick={() => setActivePieSlice(activePieSlice === entry.name ? null : entry.name)}
                    className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ background: CATEGORY_COLORS[entry.name] || "#6b7280" }}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{fmt(entry.value)}</p>
                      <p className="text-xs text-muted-foreground">
                        {totalCosts > 0 ? ((entry.value / totalCosts) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </button>
                ))}

                {activePieSlice && (() => {
                  const slice = pieData.find(d => d.name === activePieSlice);
                  if (!slice?.items?.length) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 pt-2 border-t border-border"
                    >
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Itens de {activePieSlice}:</p>
                      {slice.items.slice(0, 5).map((item) => (
                        <div key={item.name} className="flex justify-between text-xs py-0.5">
                          <span className="text-muted-foreground truncate">{item.name}</span>
                          <span className="ml-2 font-medium shrink-0">{fmt(item.value)}</span>
                        </div>
                      ))}
                    </motion.div>
                  );
                })()}
              </div>
            </div>
          )}
        </motion.div>

        {/* Bar Chart Evolution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="font-semibold text-base mb-4">Evolução nos Últimos 6 Meses</h3>
          {totalCosts === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Adicione custos para ver a evolução
            </div>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Custos Fixos" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Custos Variáveis" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* Ranking */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h3 className="font-semibold text-base mb-4">Ranking — Maiores Centros de Custo</h3>
        {allCostItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum custo cadastrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {allCostItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === "fixed" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {item.type === "fixed" ? <Building2 className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-sm font-semibold ml-2 shrink-0">{fmt(item.value)}</p>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalCosts > 0 ? (item.value / totalCosts) * 100 : 0}%` }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                      className={`h-full rounded-full ${item.type === "fixed" ? "bg-blue-400" : "bg-amber-400"}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalCosts > 0 ? ((item.value / totalCosts) * 100).toFixed(1) : 0}% do total
                    {" · "}
                    <span className={item.type === "fixed" ? "text-blue-400" : "text-amber-400"}>
                      {item.type === "fixed" ? "Fixo" : "Variável"}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
