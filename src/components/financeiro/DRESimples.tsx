import { motion } from "framer-motion";
import { ArrowDown, Equal, TrendingUp } from "lucide-react";

interface DRESimplesProps {
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  netProfit: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function DRESimples({ revenue, variableCosts, fixedCosts, netProfit }: DRESimplesProps) {
  const hasData = revenue > 0 || fixedCosts > 0;
  
  // Calculate contribution margin
  const contributionMargin = revenue - variableCosts;
  const contributionMarginPercentage = revenue > 0 ? (contributionMargin / revenue) * 100 : 0;

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h2 className="font-display text-xl font-bold mb-4">DRE Simplificada</h2>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Preencha seus dados financeiros e conclua atendimentos para visualizar sua DRE.
          </p>
        </div>
      </motion.div>
    );
  }

  const items = [
    {
      label: "Faturamento Bruto",
      value: revenue,
      displayValue: revenue,
      type: "positive",
      icon: null,
      detail: null,
    },
    {
      label: "(-) Custos Variáveis",
      value: -variableCosts,
      displayValue: variableCosts,
      type: "negative",
      icon: ArrowDown,
      detail: revenue > 0 ? `${((variableCosts / revenue) * 100).toFixed(1)}% do faturamento` : null,
    },
    {
      label: "= Margem de Contribuição",
      value: contributionMargin,
      displayValue: contributionMargin,
      type: "subtotal",
      icon: TrendingUp,
      detail: `${contributionMarginPercentage.toFixed(1)}% do faturamento`,
    },
    {
      label: "(-) Custos Fixos",
      value: -fixedCosts,
      displayValue: fixedCosts,
      type: "negative",
      icon: ArrowDown,
      detail: null,
    },
    {
      label: "= Lucro Líquido",
      value: netProfit,
      displayValue: netProfit,
      type: "result",
      icon: Equal,
      detail: revenue > 0 ? `${((netProfit / revenue) * 100).toFixed(1)}% de margem` : null,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <h2 className="font-display text-xl font-bold mb-2">DRE Simplificada</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Demonstração do Resultado do Exercício - Resumo financeiro do mês
      </p>

      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.08 }}
            className={`flex items-center justify-between p-4 rounded-lg ${
              item.type === "result" 
                ? netProfit >= 0 
                  ? "bg-success/10 border-2 border-success/30" 
                  : "bg-destructive/10 border-2 border-destructive/30"
                : item.type === "subtotal"
                ? contributionMargin >= 0
                  ? "bg-blue-500/10 border border-blue-500/30"
                  : "bg-orange-500/10 border border-orange-500/30"
                : item.type === "negative"
                ? "bg-secondary/50"
                : "bg-primary/10 border border-primary/30"
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon && (
                <item.icon className={`w-4 h-4 ${
                  item.type === "result" 
                    ? netProfit >= 0 ? "text-success" : "text-destructive"
                    : item.type === "subtotal"
                    ? contributionMargin >= 0 ? "text-blue-500" : "text-orange-500"
                    : "text-muted-foreground"
                }`} />
              )}
              <div>
                <span className={`font-medium ${
                  item.type === "result" || item.type === "subtotal" ? "font-bold" : ""
                }`}>
                  {item.label}
                </span>
                {item.detail && (
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className={`font-display font-bold text-lg ${
                item.type === "result"
                  ? netProfit >= 0 ? "text-success" : "text-destructive"
                  : item.type === "subtotal"
                  ? contributionMargin >= 0 ? "text-blue-500" : "text-orange-500"
                  : item.type === "negative"
                  ? "text-muted-foreground"
                  : "text-primary"
              }`}>
                {item.type === "negative" && item.displayValue !== 0 ? "-" : ""}
                {formatCurrency(Math.abs(item.displayValue))}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Educational note */}
      <div className="mt-6 p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">📊 Entendendo a DRE:</strong> A <strong>Margem de Contribuição</strong> mostra 
          quanto sobra após pagar custos que variam com as vendas. Esse valor precisa cobrir os <strong>Custos Fixos</strong> para 
          gerar <strong>Lucro</strong>.
        </p>
      </div>
    </motion.div>
  );
}
