import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FinancialData {
  id?: string;
  fixed_costs: number;
  variable_costs_percentage: number;
  working_days_per_month: number;
}

export interface MonthlyRevenue {
  total: number;
  completedAppointments: number;
}

export function useFinancialData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue>({ total: 0, completedAppointments: 0 });
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
        });
      } else {
        setFinancialData({
          fixed_costs: 0,
          variable_costs_percentage: 0,
          working_days_per_month: 22,
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
        .select('service_value')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('appointment_date', firstDay.toISOString().split('T')[0])
        .lte('appointment_date', lastDay.toISOString().split('T')[0]);

      if (error) throw error;

      const total = data?.reduce((sum, apt) => sum + Number(apt.service_value), 0) || 0;
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
  const calculateMetrics = useCallback(() => {
    const revenue = monthlyRevenue.total;
    const fixedCosts = financialData?.fixed_costs || 0;
    const variablePercentage = financialData?.variable_costs_percentage || 0;
    const workingDays = financialData?.working_days_per_month || 22;

    const variableCosts = revenue * (variablePercentage / 100);
    const totalCosts = fixedCosts + variableCosts;
    const netProfit = revenue - totalCosts;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    
    // Break-even: fixed costs / (1 - variable percentage)
    const breakEven = variablePercentage < 100 
      ? fixedCosts / (1 - variablePercentage / 100)
      : 0;
    
    const dailyTarget = workingDays > 0 ? breakEven / workingDays : 0;
    const costsPercentage = revenue > 0 ? (totalCosts / revenue) * 100 : 0;

    return {
      revenue,
      fixedCosts,
      variableCosts,
      totalCosts,
      netProfit,
      profitMargin,
      breakEven,
      dailyTarget,
      costsPercentage,
      completedAppointments: monthlyRevenue.completedAppointments,
      workingDays,
    };
  }, [financialData, monthlyRevenue]);

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
    isLoading,
    isSaving,
    saveFinancialData,
    calculateMetrics,
    refetch: () => Promise.all([fetchFinancialData(), fetchMonthlyRevenue()]),
  };
}
