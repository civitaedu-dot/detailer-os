import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Equal } from "lucide-react";

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
      type: "positive",
      icon: null,
    },
    {
      label: "Custos Variáveis",
      value: -variableCosts,
      type: "negative",
      icon: ArrowDown,
    },
    {
      label: "Custos Fixos",
      value: -fixedCosts,
      type: "negative",
      icon: ArrowDown,
    },
    {
      label: "Lucro Líquido",
      value: netProfit,
      type: "result",
      icon: Equal,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <h2 className="font-display text-xl font-bold mb-6">DRE Simplificada</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Demonstração do Resultado do Exercício - Resumo financeiro do mês
      </p>

      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className={`flex items-center justify-between p-4 rounded-lg ${
              item.type === "result" 
                ? netProfit >= 0 
                  ? "bg-success/10 border border-success/30" 
                  : "bg-destructive/10 border border-destructive/30"
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
                    : "text-muted-foreground"
                }`} />
              )}
              <span className={`font-medium ${
                item.type === "result" ? "font-bold" : ""
              }`}>
                {item.label}
              </span>
            </div>
            <span className={`font-display font-bold text-lg ${
              item.type === "result"
                ? netProfit >= 0 ? "text-success" : "text-destructive"
                : item.type === "negative"
                ? "text-muted-foreground"
                : "text-primary"
            }`}>
              {formatCurrency(Math.abs(item.value))}
              {item.type === "negative" && item.value !== 0 && (
                <span className="text-xs ml-1 text-muted-foreground">(-)</span>
              )}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
