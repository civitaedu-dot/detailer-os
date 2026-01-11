import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFinancialData } from "@/hooks/useFinancialData";
import { FinancialIndicators } from "@/components/financeiro/FinancialIndicators";
import { FinancialForm } from "@/components/financeiro/FinancialForm";
import { DRESimples } from "@/components/financeiro/DRESimples";
import { FinancialAnalysis } from "@/components/financeiro/FinancialAnalysis";

const Financeiro = () => {
  const { profile } = useAuth();
  const { 
    financialData, 
    isLoading, 
    isSaving, 
    saveFinancialData, 
    calculateMetrics,
    refetch 
  } = useFinancialData();

  const metrics = calculateMetrics();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display font-semibold">Financeiro</h1>
              <p className="text-xs text-muted-foreground">Controle seus números</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="font-display text-2xl font-bold mb-1">
            Olá, {profile?.name?.split(" ")[0] || "Usuário"}! 📊
          </h2>
          <p className="text-muted-foreground">
            Acompanhe a saúde financeira do seu negócio
          </p>
        </motion.div>

        {/* Financial Indicators */}
        <FinancialIndicators
          revenue={metrics.revenue}
          totalCosts={metrics.totalCosts}
          netProfit={metrics.netProfit}
          profitMargin={metrics.profitMargin}
          breakEven={metrics.breakEven}
          dailyTarget={metrics.dailyTarget}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <FinancialForm
              initialData={financialData}
              onSave={saveFinancialData}
              isSaving={isSaving}
            />
          </div>

          {/* Right Column - DRE & Analysis */}
          <div className="space-y-6">
            <DRESimples
              revenue={metrics.revenue}
              variableCosts={metrics.variableCosts}
              fixedCosts={metrics.fixedCosts}
              netProfit={metrics.netProfit}
            />

            <FinancialAnalysis
              revenue={metrics.revenue}
              costsPercentage={metrics.costsPercentage}
              netProfit={metrics.netProfit}
              profitMargin={metrics.profitMargin}
              breakEven={metrics.breakEven}
              dailyTarget={metrics.dailyTarget}
              workingDays={metrics.workingDays}
            />
          </div>
        </div>

        {/* Info about revenue calculation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-4"
        >
          <p className="text-sm text-muted-foreground">
            <strong className="text-primary">💡 Dica:</strong> O faturamento é calculado automaticamente a partir dos agendamentos concluídos na sua agenda. 
            {metrics.completedAppointments > 0 
              ? ` Você tem ${metrics.completedAppointments} atendimento${metrics.completedAppointments > 1 ? 's' : ''} concluído${metrics.completedAppointments > 1 ? 's' : ''} este mês.`
              : " Adicione e conclua atendimentos na agenda para ver o faturamento."}
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Financeiro;
