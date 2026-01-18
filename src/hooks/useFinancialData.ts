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
}

export interface MonthlyRevenue {
  total: number;
  completedAppointments: number;
}

export interface DailyRevenueData {
  date: string;
  total: number;
}

export function useFinancialData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue>({ total: 0, completedAppointments: 0 });
  const [dailyRevenues, setDailyRevenues] = useState<DailyRevenueData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        });
      } else {
        setFinancialData({
          fixed_costs: 0,
          variable_costs_percentage: 0,
          working_days_per_month: 22,
          monthly_goal: null,
          use_automatic_goal: true,
        });
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  }, [user?.id]);

  // Fetch monthly revenue from completed appointments
  const fetchMonthlyRevenue = useCallback(async () => {
    if (!user?.id) return;

    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('appointments')
        .select('service_value, appointment_date')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('appointment_date', firstDay.toISOString().split('T')[0])
        .lte('appointment_date', lastDay.toISOString().split('T')[0]);

      if (error) throw error;

      const total = data?.reduce((sum, apt) => sum + Number(apt.service_value), 0) || 0;
      
      // Group by date for daily tracking
      const dailyMap: Record<string, number> = {};
      data?.forEach(apt => {
        const date = apt.appointment_date;
        dailyMap[date] = (dailyMap[date] || 0) + Number(apt.service_value);
      });

      const dailyData = Object.entries(dailyMap).map(([date, total]) => ({
        date,
        total,
      })).sort((a, b) => a.date.localeCompare(b.date));

      setDailyRevenues(dailyData);
      setMonthlyRevenue({
        total,
        completedAppointments: data?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
    }
  }, [user?.id]);

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
    // Use fixed costs from manager if provided, otherwise use from financial_data
    const fixedCosts = fixedCostsFromManager !== undefined 
      ? fixedCostsFromManager 
      : (financialData?.fixed_costs || 0);
    // Use variable costs from manager if provided, otherwise use from financial_data
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
    
    // Break-even: fixed costs / (1 - variable percentage)
    const breakEven = variablePercentage < 100 
      ? fixedCosts / (1 - variablePercentage / 100)
      : 0;
    
    // Monthly goal: automatic (break-even) or manual
    const monthlyGoal = useAutoGoal ? breakEven : (manualGoal || 0);
    
    const dailyTarget = workingDays > 0 ? monthlyGoal / workingDays : 0;
    const costsPercentage = revenue > 0 ? (totalCosts / revenue) * 100 : 0;

    // Calculate progress
    const now = new Date();
    const currentDay = now.getDate();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Worked days so far (approximate - count weekdays or use working_days ratio)
    const workedDaysSoFar = Math.ceil((currentDay / totalDaysInMonth) * workingDays);
    const expectedRevenueSoFar = dailyTarget * workedDaysSoFar;
    const revenueDifference = revenue - expectedRevenueSoFar;
    const isAhead = revenueDifference >= 0;

    // Average daily revenue this month
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
      remainingDays: workingDays - workedDaysSoFar,
      remainingToGoal: Math.max(0, monthlyGoal - revenue),
    };
  }, [financialData, monthlyRevenue, dailyRevenues]);

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
