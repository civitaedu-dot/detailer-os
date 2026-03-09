import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FixedCost } from "@/hooks/useFixedCosts";
import { VariableCost } from "@/hooks/useVariableCosts";

interface PrevisibilidadeProps {
  fixedCosts: FixedCost[];
  variableCosts: VariableCost[];
  monthlyRevenue: number;
}

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const HIGH_COST_MONTHS = [0, 11]; // Jan (impostos anuais) e Dez (13o salário)

const SEASONAL_MULTIPLIERS = [1.08, 1.0, 0.97, 0.98, 0.99, 0.97, 0.96, 0.98, 1.0, 1.01, 1.04, 1.12];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{fmt(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-border mt-2 pt-2 font-semibold">
        Total: {fmt(payload.reduce((s, p) => s + (p.value || 0), 0))}
      </div>
    </div>
  );
};

export function PrevisibilidadeCustos({ fixedCosts, variableCosts, monthlyRevenue }: PrevisibilidadeProps) {
  const [scenario, setScenario] = useState<"pessimista" | "realista" | "otimista">("realista");
  const [volumeMultiplier, setVolumeMultiplier] = useState(100);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  const totalFixed = useMemo(
    () => fixedCosts.filter((c) => c.is_active).reduce((s, c) => s + c.value, 0),
    [fixedCosts]
  );

  const baseVariableValue = useMemo(() => {
    return variableCosts.reduce((sum, cost) => {
      if (cost.cost_type === "percentage") return sum + (monthlyRevenue * cost.value) / 100;
      return sum + cost.value;
    }, 0);
  }, [variableCosts, monthlyRevenue]);

  const scenarioMultipliers = { pessimista: 0.80, realista: 1.0, otimista: 1.20 };

  const projectionData = useMemo(() => {
    const currentMonthIdx = new Date().getMonth();
    return MONTHS.map((month, i) => {
      const idx = (currentMonthIdx + i) % 12;
      const seasonal = SEASONAL_MULTIPLIERS[idx];
      const scenMult = scenarioMultipliers[scenario];
      const volMult = volumeMultiplier / 100;

      const fixedVal = Math.round(totalFixed * seasonal * (idx === 11 ? 1.08 : 1));
      const varVal = Math.round(baseVariableValue * seasonal * scenMult * volMult);

      return {
        month,
        monthIdx: idx,
        "Custos Fixos": fixedVal,
        "Custos Variáveis": varVal,
        total: fixedVal + varVal,
        isHighCost: HIGH_COST_MONTHS.includes(idx),
      };
    });
  }, [totalFixed, baseVariableValue, scenario, volumeMultiplier]);

  const alerts = useMemo(() => {
    const msgs: { type: "warning" | "info"; text: string }[] = [];
    if (totalFixed > 0 && baseVariableValue > 0) {
      const variableRatio = baseVariableValue / (totalFixed + baseVariableValue);
      if (variableRatio > 0.6) msgs.push({ type: "warning", text: "Custos variáveis representam mais de 60% do total — alta dependência do volume de vendas." });
    }
    if (fixedCosts.length === 0) msgs.push({ type: "info", text: "Cadastre seus custos fixos para projeções mais precisas." });
    if (variableCosts.length === 0) msgs.push({ type: "info", text: "Cadastre custos variáveis para simular cenários de crescimento." });
    msgs.push({ type: "warning", text: "Dezembro tende a ter custos maiores com 13º salário e renovações anuais. Planeje com antecedência." });
    msgs.push({ type: "info", text: "Janeiro costuma concentrar impostos anuais e renovações de contratos." });
    return msgs.slice(0, 3);
  }, [totalFixed, baseVariableValue, fixedCosts, variableCosts]);

  const scenarioColors = {
    pessimista: "border-red-500/30 bg-red-500/5 text-red-400",
    realista: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    otimista: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                alert.type === "warning"
                  ? "bg-amber-500/5 border-amber-500/20 text-amber-300"
                  : "bg-blue-500/5 border-blue-500/20 text-blue-300"
              }`}
            >
              {alert.type === "warning" ? (
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <Zap className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{alert.text}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Scenario Selector + Volume Slider */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <h3 className="font-semibold">Simulador de Cenários</h3>

        <div className="grid grid-cols-3 gap-3">
          {(["pessimista", "realista", "otimista"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`p-3 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                scenario === s ? scenarioColors[s] : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {s === "pessimista" ? "📉 Pessimista" : s === "realista" ? "📊 Realista" : "📈 Otimista"}
              <p className="text-xs font-normal mt-1 text-muted-foreground">
                {s === "pessimista" ? "-20% volume" : s === "realista" ? "volume atual" : "+20% volume"}
              </p>
            </button>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Volume de Vendas</label>
            <span className="text-sm font-bold text-primary">{volumeMultiplier}%</span>
          </div>
          <Slider
            value={[volumeMultiplier]}
            onValueChange={(v) => setVolumeMultiplier(v[0])}
            min={50} max={200} step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>50%</span>
            <span>Volume base</span>
            <span>200%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Custos Fixos/mês</p>
            <p className="font-bold text-blue-400">{fmt(totalFixed)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Variáveis Estimados</p>
            <p className="font-bold text-amber-400">{fmt(baseVariableValue * scenarioMultipliers[scenario] * volumeMultiplier / 100)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Previsto</p>
            <p className="font-bold">{fmt(totalFixed + baseVariableValue * scenarioMultipliers[scenario] * volumeMultiplier / 100)}</p>
          </div>
        </div>
      </div>

      {/* Area Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h3 className="font-semibold mb-4">Projeção — Próximos 12 Meses</h3>
        {totalFixed === 0 && baseVariableValue === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Adicione custos para ver a projeção
          </div>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradFixed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradVar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Custos Fixos" stroke="#3b82f6" fill="url(#gradFixed)" strokeWidth={2} />
                <Area type="monotone" dataKey="Custos Variáveis" stroke="#f97316" fill="url(#gradVar)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Monthly Projection Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Tabela de Projeção Mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 text-muted-foreground font-medium">Mês</th>
                <th className="text-right p-3 text-blue-400 font-medium">Fixos</th>
                <th className="text-right p-3 text-amber-400 font-medium">Variáveis</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {projectionData.map((row, i) => (
                <>
                  <tr
                    key={row.month}
                    className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${
                      row.isHighCost ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <td className="p-3 font-medium">
                      {row.month}
                      {row.isHighCost && (
                        <span className="ml-2 text-xs bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">
                          atenção
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-blue-400">{fmt(row["Custos Fixos"])}</td>
                    <td className="p-3 text-right text-amber-400">{fmt(row["Custos Variáveis"])}</td>
                    <td className="p-3 text-right font-semibold">{fmt(row.total)}</td>
                    <td className="p-3">
                      <button onClick={() => setExpandedMonth(expandedMonth === i ? null : i)} className="text-muted-foreground hover:text-foreground">
                        {expandedMonth === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  {expandedMonth === i && (
                    <tr key={`${row.month}-detail`} className="bg-secondary/30">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <p className="font-medium text-blue-400 mb-1">Custos Fixos</p>
                            {fixedCosts.filter(c => c.is_active).map(c => (
                              <div key={c.id} className="flex justify-between">
                                <span>{c.name}</span>
                                <span>{fmt(c.value)}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="font-medium text-amber-400 mb-1">Custos Variáveis</p>
                            {variableCosts.map(c => (
                              <div key={c.id} className="flex justify-between">
                                <span>{c.name}</span>
                                <span>{c.cost_type === "percentage" ? `${c.value}%` : fmt(c.value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/50 font-semibold">
                <td className="p-3">Total 12 meses</td>
                <td className="p-3 text-right text-blue-400">{fmt(projectionData.reduce((s, r) => s + r["Custos Fixos"], 0))}</td>
                <td className="p-3 text-right text-amber-400">{fmt(projectionData.reduce((s, r) => s + r["Custos Variáveis"], 0))}</td>
                <td className="p-3 text-right">{fmt(projectionData.reduce((s, r) => s + r.total, 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
