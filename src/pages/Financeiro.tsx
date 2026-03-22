import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw,
  Loader2,
  LogOut,
  Lock,
  TrendingDown,
  Clock,
  Calculator
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, isTrialActive } from "@/contexts/AuthContext";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useFinancialEntries, type FinancialEntry, type FinancialEntryFormData } from "@/hooks/useFinancialEntries";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { FinancialIndicators } from "@/components/financeiro/FinancialIndicators";
import { DRESimples } from "@/components/financeiro/DRESimples";
import { DFCReport } from "@/components/financeiro/DFCReport";
import { PaymentFeesManager } from "@/components/financeiro/PaymentFeesManager";
import { FinancialAnalysis } from "@/components/financeiro/FinancialAnalysis";
import { DailyGoalTracker } from "@/components/financeiro/DailyGoalTracker";
import { WorkingDaysConfig } from "@/components/financeiro/WorkingDaysConfig";
import { FinancialEntriesList } from "@/components/financeiro/FinancialEntriesList";
import { ManualEntryModal } from "@/components/financeiro/ManualEntryModal";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { GestaoCompletaCustos } from "@/components/financeiro/GestaoCompletaCustos";
import { ValorHoraEmpresa } from "@/components/financeiro/ValorHoraEmpresa";
import { PrecificacaoServicos } from "@/components/financeiro/PrecificacaoServicos";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useVariableCosts } from "@/hooks/useVariableCosts";
import { useFixedCosts } from "@/hooks/useFixedCosts";
const Financeiro = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Check if user has DFC access (gestao or escala plan, or admin bypass)
  const hasDFCAccess = useMemo(() => {
    if (isTrialActive(profile)) return true; // trial = gestao access
    const plan = profile?.plan;
    return plan === "gestao" || plan === "escala";
  }, [profile]);

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

  // Services for pricing
  const { services, updateService, isUpdating: isUpdatingService } = useServices();
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
      hours_per_day: financialData.hours_per_day,
      avg_services_per_day: financialData.avg_services_per_day,
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
      hours_per_day: financialData.hours_per_day,
      avg_services_per_day: financialData.avg_services_per_day,
    });
  };

  const handleSaveHourlyParams = async (hoursPerDay: number, avgServicesPerDay: number) => {
    if (!financialData) return;
    
    await saveFinancialData({
      fixed_costs: localFixedCosts,
      variable_costs_percentage: localVariablePercentage,
      working_days_per_month: financialData.working_days_per_month,
      monthly_goal: financialData.monthly_goal,
      use_automatic_goal: financialData.use_automatic_goal,
      hours_per_day: hoursPerDay,
      avg_services_per_day: avgServicesPerDay,
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
    <div className="p-4 sm:p-6 lg:p-8">
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

        {/* Tabs: Visão Geral + Custos + Valor Hora + Precificação + DFC */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2.5 sm:px-3">Visão Geral</TabsTrigger>
              <TabsTrigger value="custos" className="text-xs sm:text-sm px-2.5 sm:px-3">
                <TrendingDown className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                Custos
              </TabsTrigger>
              <TabsTrigger value="valorhora" className="text-xs sm:text-sm px-2.5 sm:px-3">
                <Clock className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                Valor Hora
              </TabsTrigger>
              <TabsTrigger value="precificacao" className="text-xs sm:text-sm px-2.5 sm:px-3">
                <Calculator className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                Precificação
              </TabsTrigger>
              <TabsTrigger value="dfc" className="text-xs sm:text-sm px-2.5 sm:px-3" disabled={!hasDFCAccess}>
                {!hasDFCAccess && <Lock className="w-3 h-3 mr-1 sm:mr-1.5" />}
                DFC
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: Visão Geral */}
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
              {/* Left Column - Config */}
              <div className="space-y-6">
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

          {/* TAB: Custos */}
          <TabsContent value="custos" className="space-y-6">
            <GestaoCompletaCustos
              monthlyRevenue={monthlyRevenue.total}
              onFixedChange={handleFixedCostsChange}
              onVariableChange={handleVariableCostsChange}
            />
          </TabsContent>

          {/* TAB: Valor Hora */}
          <TabsContent value="valorhora" className="space-y-6">
            <ValorHoraEmpresa
              fixedCosts={localFixedCosts}
              variableCostsPercentage={localVariablePercentage}
              workingDays={financialData?.working_days_per_month || 22}
              hoursPerDay={financialData?.hours_per_day || 8}
              avgServicesPerDay={financialData?.avg_services_per_day || 3}
              monthlyRevenue={monthlyRevenue.total}
              onSave={handleSaveHourlyParams}
              isSaving={isSaving}
            />
          </TabsContent>

          {/* TAB: Precificação */}
          <TabsContent value="precificacao" className="space-y-6">
            <PrecificacaoServicos
              hourlyRate={
                (() => {
                  const hours = (financialData?.hours_per_day || 8);
                  const days = (financialData?.working_days_per_month || 22);
                  const totalHours = days * hours;
                  const varCosts = monthlyRevenue.total * (localVariablePercentage / 100);
                  const totalCost = localFixedCosts + varCosts;
                  return totalHours > 0 ? totalCost / totalHours : 0;
                })()
              }
              costPerService={
                (() => {
                  const services_per_day = (financialData?.avg_services_per_day || 3);
                  const days = (financialData?.working_days_per_month || 22);
                  const totalServices = days * services_per_day;
                  const varCosts = monthlyRevenue.total * (localVariablePercentage / 100);
                  const totalCost = localFixedCosts + varCosts;
                  return totalServices > 0 ? totalCost / totalServices : 0;
                })()
              }
              services={services}
              onUpdateService={updateService}
              isUpdating={isUpdatingService}
            />
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
    </div>
  );
};

export default Financeiro;
