import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw,
  Loader2,
  LogOut,
  Lock
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useFinancialEntries, type FinancialEntry, type FinancialEntryFormData } from "@/hooks/useFinancialEntries";
import { useClients } from "@/hooks/useClients";
import { FinancialIndicators } from "@/components/financeiro/FinancialIndicators";
import { DRESimples } from "@/components/financeiro/DRESimples";
import { DFCReport } from "@/components/financeiro/DFCReport";
import { PaymentFeesManager } from "@/components/financeiro/PaymentFeesManager";
import { FinancialAnalysis } from "@/components/financeiro/FinancialAnalysis";
import { DailyGoalTracker } from "@/components/financeiro/DailyGoalTracker";
import { VariableCostsManager } from "@/components/financeiro/VariableCostsManager";
import { FixedCostsManager } from "@/components/financeiro/FixedCostsManager";
import { WorkingDaysConfig } from "@/components/financeiro/WorkingDaysConfig";
import { FinancialEntriesList } from "@/components/financeiro/FinancialEntriesList";
import { ManualEntryModal } from "@/components/financeiro/ManualEntryModal";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

  // Check if user has DFC access (gestao or escala plan, or admin bypass)
  const hasDFCAccess = useMemo(() => {
    const plan = profile?.plan;
    return plan === "gestao" || plan === "escala";
  }, [profile?.plan]);

  // Month selector state
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  
  const isCurrentMonth = useMemo(() => {
    const today = new Date();
    return selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() === today.getMonth();
  }, [selectedDate]);

  const { 
    financialData, 
    isLoading, 
    isSaving, 
    saveFinancialData, 
    calculateMetrics,
    refetch,
    monthlyRevenue
  } = useFinancialData(selectedDate);
  
  const { 
    variableCosts,
    calculateTotalPercentage, 
    refetch: refetchVariableCosts 
  } = useVariableCosts();

  const {
    fixedCosts,
    calculateTotalFixedCosts,
    refetch: refetchFixedCosts
  } = useFixedCosts();

  // Financial entries for the selected month
  const firstDayOfMonth = useMemo(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), [selectedDate]);
  const lastDayOfMonth = useMemo(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0), [selectedDate]);
  
  const {
    entries,
    isLoading: isLoadingEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    refetch: refetchEntries,
  } = useFinancialEntries(firstDayOfMonth, lastDayOfMonth);

  // Clients for manual entry
  const { clients } = useClients();

  // Modal state
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<FinancialEntry | null>(null);

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
      refetchFixedCosts(),
      refetchEntries()
    ]);
    setLocalFixedCosts(calculateTotalFixedCosts());
    setLocalVariablePercentage(calculateTotalPercentage(monthlyRevenue.total));
  };

  // Manual entry handlers
  const handleOpenManualEntry = () => {
    setEntryToEdit(null);
    setIsManualEntryModalOpen(true);
  };

  const handleEditEntry = (entry: FinancialEntry) => {
    setEntryToEdit(entry);
    setIsManualEntryModalOpen(true);
  };

  const handleSubmitEntry = async (data: FinancialEntryFormData) => {
    if (entryToEdit) {
      const success = await updateEntry(entryToEdit.id, data);
      if (success) {
        await refetch();
        return entryToEdit as FinancialEntry;
      }
      return null;
    } else {
      const result = await createEntry(data);
      if (result) {
        await refetch();
      }
      return result;
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const success = await deleteEntry(id);
    if (success) {
      await refetch();
    }
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
        {/* Welcome + Month Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h2 className="font-display text-2xl font-bold mb-1">
              Financeiro 📊
            </h2>
            <p className="text-muted-foreground text-sm">
              {isCurrentMonth 
                ? "Acompanhe a saúde financeira do seu negócio" 
                : "Visualizando histórico financeiro"}
            </p>
          </div>
          <MonthSelector selectedDate={selectedDate} onMonthChange={setSelectedDate} />
        </motion.div>

        {/* Past month banner */}
        {!isCurrentMonth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-secondary/80 border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground"
          >
            📅 Você está visualizando dados históricos. A edição de custos e metas afeta apenas a configuração atual.
          </motion.div>
        )}

        {/* Tabs: Visão Geral + DFC */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview" className="flex-1 sm:flex-none">Visão Geral</TabsTrigger>
            <TabsTrigger value="dfc" className="flex-1 sm:flex-none" disabled={!hasDFCAccess}>
              {!hasDFCAccess && <Lock className="w-3 h-3 mr-1.5" />}
              DFC – Fluxo de Caixa
            </TabsTrigger>
          </TabsList>

          {/* TAB: Visão Geral (existing content) */}
          <TabsContent value="overview" className="space-y-6">
            {/* Financial Indicators */}
            <FinancialIndicators
              revenue={metrics.revenue}
              totalCosts={metrics.totalCosts}
              netProfit={metrics.netProfit}
              profitMargin={metrics.profitMargin}
              breakEven={metrics.breakEven}
              dailyTarget={metrics.dailyTarget}
            />

            {/* Daily Goal Tracker */}
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

            {/* Financial Entries Section */}
            <FinancialEntriesList
              entries={entries}
              isLoading={isLoadingEntries}
              onAddManual={isCurrentMonth ? handleOpenManualEntry : undefined}
              onEdit={isCurrentMonth ? handleEditEntry : undefined}
              onDelete={isCurrentMonth ? handleDeleteEntry : undefined}
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

                <PaymentFeesManager />
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
                <strong className="text-primary">💡 Dica:</strong> O faturamento é calculado automaticamente a partir dos agendamentos concluídos e entradas manuais. 
                {entries.length > 0 
                  ? ` Você tem ${entries.length} entrada${entries.length > 1 ? 's' : ''} financeira${entries.length > 1 ? 's' : ''} neste período${metrics.completedAppointments > 0 ? ` (${metrics.completedAppointments} automática${metrics.completedAppointments > 1 ? 's' : ''})` : ''}.`
                  : " Conclua atendimentos na agenda ou adicione entradas manuais para ver o faturamento."}
              </p>
            </motion.div>
          </TabsContent>

          {/* TAB: DFC */}
          <TabsContent value="dfc" className="space-y-6">
            {hasDFCAccess ? (
              <DFCReport
                entries={entries}
                fixedCosts={fixedCosts}
                variableCosts={variableCosts}
                monthlyRevenue={monthlyRevenue.total}
              />
            ) : (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Lock className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-display text-lg font-bold mb-2">Recurso disponível no plano Gestão</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  O Demonstrativo de Fluxo de Caixa está disponível a partir do plano Gestão.
                </p>
                <Button asChild>
                  <Link to="/planos">Ver planos</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Manual Entry Modal */}
        <ManualEntryModal
          isOpen={isManualEntryModalOpen}
          onClose={() => setIsManualEntryModalOpen(false)}
          onSubmit={handleSubmitEntry}
          clients={clients}
          entryToEdit={entryToEdit}
        />
      </main>
    </div>
  );
};

export default Financeiro;
