import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw,
  Loader2,
  LogOut
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFinancialData } from "@/hooks/useFinancialData";
import { FinancialIndicators } from "@/components/financeiro/FinancialIndicators";
import { DRESimples } from "@/components/financeiro/DRESimples";
import { FinancialAnalysis } from "@/components/financeiro/FinancialAnalysis";
import { DailyGoalTracker } from "@/components/financeiro/DailyGoalTracker";
import { VariableCostsManager } from "@/components/financeiro/VariableCostsManager";
import { FixedCostsManager } from "@/components/financeiro/FixedCostsManager";
import { WorkingDaysConfig } from "@/components/financeiro/WorkingDaysConfig";
import { useVariableCosts } from "@/hooks/useVariableCosts";
import { useFixedCosts } from "@/hooks/useFixedCosts";
import logo from "@/assets/logo.jpeg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Financeiro = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { 
    financialData, 
    isLoading, 
    isSaving, 
    saveFinancialData, 
    calculateMetrics,
    refetch,
    monthlyRevenue
  } = useFinancialData();
  
  const { 
    calculateTotalPercentage, 
    refetch: refetchVariableCosts 
  } = useVariableCosts();

  const {
    calculateTotalFixedCosts,
    refetch: refetchFixedCosts
  } = useFixedCosts();

  // Local state for real-time updates
  const [localFixedCosts, setLocalFixedCosts] = useState(0);
  const [localVariablePercentage, setLocalVariablePercentage] = useState(0);

  // Initialize local state from hooks
  useEffect(() => {
    setLocalFixedCosts(calculateTotalFixedCosts());
    setLocalVariablePercentage(calculateTotalPercentage(monthlyRevenue.total));
  }, [calculateTotalFixedCosts, calculateTotalPercentage, monthlyRevenue.total]);
  
  // Calculate metrics with the managed costs
  const metrics = calculateMetrics(localVariablePercentage, localFixedCosts);

  const handleSaveGoal = async (goal: number | null, useAuto: boolean) => {
    if (!financialData) return;
    
    await saveFinancialData({
      fixed_costs: localFixedCosts,
      variable_costs_percentage: localVariablePercentage,
      working_days_per_month: financialData.working_days_per_month,
      monthly_goal: goal,
      use_automatic_goal: useAuto,
    });
  };

  const handleSaveWorkingDays = async (days: number) => {
    if (!financialData) return;
    
    await saveFinancialData({
      fixed_costs: localFixedCosts,
      variable_costs_percentage: localVariablePercentage,
      working_days_per_month: days,
      monthly_goal: financialData.monthly_goal,
      use_automatic_goal: financialData.use_automatic_goal,
    });
  };

  const handleVariableCostsChange = (percentage: number) => {
    setLocalVariablePercentage(percentage);
    refetchVariableCosts();
  };

  const handleFixedCostsChange = (total: number) => {
    setLocalFixedCosts(total);
    refetchFixedCosts();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleRefresh = async () => {
    await Promise.all([
      refetch(),
      refetchVariableCosts(),
      refetchFixedCosts()
    ]);
    // Update local state after refetch
    setLocalFixedCosts(calculateTotalFixedCosts());
    setLocalVariablePercentage(calculateTotalPercentage(monthlyRevenue.total));
  };

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
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={logo} alt="DetailerOS Logo" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-display font-semibold hidden sm:block">
                Detailer<span className="text-primary">OS</span>
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link to="/financeiro">Financeiro</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/agenda">Agenda</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/clientes">Clientes</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/servicos">Serviços</Link>
            </Button>
          </nav>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                  <span className="text-xs font-semibold text-primary">
                    {profile?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <span className="hidden sm:block">{profile?.name || "Usuário"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Atualizar dados
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

        {/* Daily Goal Tracker - Highlighted Section */}
        <DailyGoalTracker
          monthlyGoal={metrics.monthlyGoal}
          dailyTarget={metrics.dailyTarget}
          revenue={metrics.revenue}
          workingDays={metrics.workingDays}
          useAutoGoal={metrics.useAutoGoal}
          breakEven={metrics.breakEven}
          workedDaysSoFar={metrics.workedDaysSoFar}
          expectedRevenueSoFar={metrics.expectedRevenueSoFar}
          revenueDifference={metrics.revenueDifference}
          isAhead={metrics.isAhead}
          avgDailyRevenue={metrics.avgDailyRevenue}
          remainingDays={metrics.remainingDays}
          remainingToGoal={metrics.remainingToGoal}
          manualGoal={financialData?.monthly_goal || null}
          onSaveGoal={handleSaveGoal}
          isSaving={isSaving}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Cost Management */}
          <div className="space-y-6">
            <FixedCostsManager 
              onTotalChange={handleFixedCostsChange}
            />
            
            <VariableCostsManager 
              monthlyRevenue={monthlyRevenue.total}
              onTotalPercentageChange={handleVariableCostsChange}
            />

            <WorkingDaysConfig
              workingDays={financialData?.working_days_per_month || 22}
              onSave={handleSaveWorkingDays}
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
