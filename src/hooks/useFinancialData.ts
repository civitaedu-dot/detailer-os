import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FinancialData {
  id?: string;
  fixed_costs: number;
  variable_costs_percentage: number;
  working_days_per_month: number;
  monthly_goal: number | null;
  use_automatic_goal: boolean;
  hours_per_day: number;
  avg_services_per_day: number;
}

export interface MonthlyRevenue {
  total: number;
  completedAppointments: number;
}

export interface DailyRevenueData {
  date: string;
  total: number;
}

export function useFinancialData(selectedDate?: Date) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue>({ total: 0, completedAppointments: 0 });
  const [dailyRevenues, setDailyRevenues] = useState<DailyRevenueData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Use selectedDate or default to current month
  const referenceDate = selectedDate || new Date();

  // Fetch financial data
  const fetchFinancialData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('financial_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFinancialData({
          id: data.id,
          fixed_costs: Number(data.fixed_costs),
          variable_costs_percentage: Number(data.variable_costs_percentage),
          working_days_per_month: data.working_days_per_month,
          monthly_goal: data.monthly_goal ? Number(data.monthly_goal) : null,
          use_automatic_goal: data.use_automatic_goal ?? true,
          hours_per_day: Number(data.hours_per_day) || 8,
          avg_services_per_day: Number(data.avg_services_per_day) || 3,
        });
      } else {
        setFinancialData({
          fixed_costs: 0,
          variable_costs_percentage: 0,
          working_days_per_month: 22,
          monthly_goal: null,
          use_automatic_goal: true,
          hours_per_day: 8,
          avg_services_per_day: 3,
        });
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  }, [user?.id]);

  // Fetch monthly revenue from financial_entries table for the selected month
  const fetchMonthlyRevenue = useCallback(async () => {
    if (!user?.id) return;

    try {
      const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('financial_entries')
        .select('value, entry_date, is_automatic')
        .eq('user_id', user.id)
        .gte('entry_date', toLocalDateString(firstDay))
        .lte('entry_date', toLocalDateString(lastDay));

      if (error) throw error;

      const total = data?.reduce((sum, entry) => sum + Number(entry.value), 0) || 0;
      
      // Group by date for daily tracking
      const dailyMap: Record<string, number> = {};
      data?.forEach(entry => {
        const date = entry.entry_date;
        dailyMap[date] = (dailyMap[date] || 0) + Number(entry.value);
      });

      const dailyData = Object.entries(dailyMap).map(([date, total]) => ({
        date,
        total,
      })).sort((a, b) => a.date.localeCompare(b.date));

      setDailyRevenues(dailyData);
      setMonthlyRevenue({
        total,
        completedAppointments: data?.filter(e => e.is_automatic).length || 0,
      });
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, referenceDate.getFullYear(), referenceDate.getMonth()]);

  // Save financial data
  const saveFinancialData = async (data: Omit<FinancialData, 'id'>) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('financial_data')
        .upsert({
          user_id: user.id,
          fixed_costs: data.fixed_costs,
          variable_costs_percentage: data.variable_costs_percentage,
          working_days_per_month: data.working_days_per_month,
          monthly_goal: data.monthly_goal,
          use_automatic_goal: data.use_automatic_goal,
          hours_per_day: data.hours_per_day,
          avg_services_per_day: data.avg_services_per_day,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setFinancialData(prev => ({ ...prev, ...data }));
      
      toast({
        title: "Dados salvos!",
        description: "Suas informações financeiras foram atualizadas.",
      });
    } catch (error) {
      console.error('Error saving financial data:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados financeiros.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate financial metrics
  const calculateMetrics = useCallback((variableCostsFromManager?: number, fixedCostsFromManager?: number) => {
    const revenue = monthlyRevenue.total;
    const fixedCosts = fixedCostsFromManager !== undefined 
      ? fixedCostsFromManager 
      : (financialData?.fixed_costs || 0);
    const variablePercentage = variableCostsFromManager !== undefined 
      ? variableCostsFromManager 
      : (financialData?.variable_costs_percentage || 0);
    const workingDays = financialData?.working_days_per_month || 22;
    const useAutoGoal = financialData?.use_automatic_goal ?? true;
    const manualGoal = financialData?.monthly_goal;

    const variableCosts = revenue * (variablePercentage / 100);
    const totalCosts = fixedCosts + variableCosts;
    const netProfit = revenue - totalCosts;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    
    const breakEven = variablePercentage < 100 
      ? fixedCosts / (1 - variablePercentage / 100)
      : 0;
    
    const monthlyGoal = useAutoGoal ? breakEven : (manualGoal || 0);
    const dailyTarget = workingDays > 0 ? monthlyGoal / workingDays : 0;
    const costsPercentage = revenue > 0 ? (totalCosts / revenue) * 100 : 0;

    const now = new Date();
    const currentDay = now.getDate();
    const totalDaysInMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
    
    // For past months, use full working days; for current month, calculate proportionally
    const isCurrentMonth = referenceDate.getFullYear() === now.getFullYear() && referenceDate.getMonth() === now.getMonth();
    const workedDaysSoFar = isCurrentMonth 
      ? Math.ceil((currentDay / totalDaysInMonth) * workingDays)
      : workingDays;
    const expectedRevenueSoFar = dailyTarget * workedDaysSoFar;
    const revenueDifference = revenue - expectedRevenueSoFar;
    const isAhead = revenueDifference >= 0;

    const daysWithRevenue = dailyRevenues.length;
    const avgDailyRevenue = daysWithRevenue > 0 ? revenue / daysWithRevenue : 0;

    return {
      revenue,
      fixedCosts,
      variableCosts,
      totalCosts,
      netProfit,
      profitMargin,
      breakEven,
      monthlyGoal,
      dailyTarget,
      costsPercentage,
      completedAppointments: monthlyRevenue.completedAppointments,
      workingDays,
      useAutoGoal,
      workedDaysSoFar,
      expectedRevenueSoFar,
      revenueDifference,
      isAhead,
      avgDailyRevenue,
      remainingDays: isCurrentMonth ? workingDays - workedDaysSoFar : 0,
      remainingToGoal: Math.max(0, monthlyGoal - revenue),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialData, monthlyRevenue, dailyRevenues, referenceDate.getFullYear(), referenceDate.getMonth()]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchFinancialData(), fetchMonthlyRevenue()]);
      setIsLoading(false);
    };

    if (user?.id) {
      loadData();
    }
  }, [user?.id, fetchFinancialData, fetchMonthlyRevenue]);

  return {
    financialData,
    monthlyRevenue,
    dailyRevenues,
    isLoading,
    isSaving,
    saveFinancialData,
    calculateMetrics,
    refetch: () => Promise.all([fetchFinancialData(), fetchMonthlyRevenue()]),
  };
}
