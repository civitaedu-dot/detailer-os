import { motion } from "framer-motion";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Target,
  PiggyBank,
  Calculator
} from "lucide-react";

interface FinancialIndicatorsProps {
  revenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  breakEven: number;
  dailyTarget: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function FinancialIndicators({
  revenue,
  totalCosts,
  netProfit,
  profitMargin,
  breakEven,
  dailyTarget,
}: FinancialIndicatorsProps) {
  const indicators = [
    {
      label: "Faturamento do Mês",
      value: formatCurrency(revenue),
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Custos Totais",
      value: formatCurrency(totalCosts),
      icon: TrendingDown,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Lucro Estimado",
      value: formatCurrency(netProfit),
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      color: netProfit >= 0 ? "text-success" : "text-destructive",
      bgColor: netProfit >= 0 ? "bg-success/10" : "bg-destructive/10",
    },
    {
      label: "Margem de Lucro",
      value: `${profitMargin.toFixed(1)}%`,
      icon: PiggyBank,
      color: profitMargin >= 20 ? "text-success" : profitMargin >= 0 ? "text-warning" : "text-destructive",
      bgColor: profitMargin >= 20 ? "bg-success/10" : profitMargin >= 0 ? "bg-warning/10" : "bg-destructive/10",
    },
    {
      label: "Ponto de Equilíbrio",
      value: formatCurrency(breakEven),
      icon: Target,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Meta Diária",
      value: formatCurrency(dailyTarget),
      icon: Calculator,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {indicators.map((indicator, index) => (
        <motion.div
          key={indicator.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <div className={`w-10 h-10 rounded-lg ${indicator.bgColor} flex items-center justify-center mb-3`}>
            <indicator.icon className={`w-5 h-5 ${indicator.color}`} />
          </div>
          <p className="text-lg font-bold font-display">{indicator.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{indicator.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
