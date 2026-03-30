import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  Target,
  Calendar
} from "lucide-react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";

interface FinancialAnalysisProps {
  revenue: number;
  costsPercentage: number;
  netProfit: number;
  profitMargin: number;
  breakEven: number;
  dailyTarget: number;
  workingDays: number;
}

export function FinancialAnalysis({
  revenue,
  costsPercentage,
  netProfit,
  profitMargin,
  breakEven,
  dailyTarget,
  workingDays,
}: FinancialAnalysisProps) {
  const { maskCurrency, maskValue } = usePrivacyMode();
  const formatCurrency = (value: number) => maskCurrency(value);
  const hasData = revenue > 0 || breakEven > 0;

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h2 className="font-display text-xl font-bold mb-4">Análise Financeira</h2>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Complete seus dados financeiros para receber análises personalizadas do seu negócio.
          </p>
        </div>
      </motion.div>
    );
  }

  // Determine health status
  const getHealthStatus = () => {
    if (profitMargin >= 30) {
      return {
        status: "excellent",
        message: "Excelente! Seu negócio está muito saudável financeiramente.",
        icon: CheckCircle2,
        color: "text-success",
        bgColor: "bg-success/10",
        borderColor: "border-success/30",
      };
    } else if (profitMargin >= 15) {
      return {
        status: "good",
        message: "Bom! Seu negócio está saudável, mas há espaço para crescer.",
        icon: TrendingUp,
        color: "text-primary",
        bgColor: "bg-primary/10",
        borderColor: "border-primary/30",
      };
    } else if (profitMargin >= 0) {
      return {
        status: "attention",
        message: "Atenção! Sua margem está apertada. Revise seus custos.",
        icon: AlertTriangle,
        color: "text-warning",
        bgColor: "bg-warning/10",
        borderColor: "border-warning/30",
      };
    } else {
      return {
        status: "critical",
        message: "Cuidado! Você está operando com prejuízo. Ação urgente necessária.",
        icon: TrendingDown,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/30",
      };
    }
  };

  const health = getHealthStatus();
  const revenueNeeded = breakEven - revenue;
  const revenueStatus = revenue >= breakEven;

  const insights = [
    {
      icon: Target,
      title: "Custos vs Faturamento",
      content: `Seus custos representam ${costsPercentage.toFixed(1)}% do faturamento.`,
      detail: costsPercentage > 80 
        ? "Tente reduzir custos para aumentar sua margem."
        : costsPercentage > 60
        ? "Margem razoável, mas pode melhorar."
        : "Ótimo controle de custos!",
    },
    {
      icon: Calendar,
      title: "Meta Diária",
      content: `Para cobrir seus custos, você precisa faturar ${formatCurrency(dailyTarget)} por dia.`,
      detail: `Considerando ${workingDays} dias trabalhados no mês.`,
    },
    {
      icon: revenueStatus ? CheckCircle2 : AlertTriangle,
      title: revenueStatus ? "Meta Atingida!" : "Falta para a Meta",
      content: revenueStatus 
        ? `Você ultrapassou seu ponto de equilíbrio em ${formatCurrency(Math.abs(revenueNeeded))}!`
        : `Faltam ${formatCurrency(revenueNeeded)} para cobrir todos os custos.`,
      detail: revenueStatus
        ? "Continue assim para aumentar seu lucro."
        : "Foque em fechar mais serviços este mês.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <h2 className="font-display text-xl font-bold mb-6">Análise Financeira</h2>

      {/* Health Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className={`p-4 rounded-lg ${health.bgColor} border ${health.borderColor} mb-6`}
      >
        <div className="flex items-start gap-3">
          <health.icon className={`w-6 h-6 ${health.color} shrink-0 mt-0.5`} />
          <div>
            <p className={`font-semibold ${health.color}`}>{health.message}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Margem de lucro atual: {profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </motion.div>

      {/* Insights */}
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="p-4 rounded-lg bg-secondary/50"
          >
            <div className="flex items-start gap-3">
              <insight.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{insight.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{insight.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{insight.detail}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
