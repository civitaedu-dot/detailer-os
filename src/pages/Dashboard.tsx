import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign, TrendingUp, Calendar, Bot,
  ArrowUpRight, ArrowDownRight, RefreshCw, Wrench, Users, Clock
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, isTrialActive, getTrialDaysRemaining } from "@/contexts/AuthContext";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useFixedCosts } from "@/hooks/useFixedCosts";
import { useVariableCosts } from "@/hooks/useVariableCosts";
import { useAppointments } from "@/hooks/useAppointments";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const Dashboard = () => {
  const { profile, checkSubscription, isCheckingSubscription } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const { monthlyRevenue, isLoading: isLoadingFinancial, calculateMetrics, refetch } = useFinancialData();
  const { calculateTotalFixedCosts } = useFixedCosts();
  const { calculateTotalPercentage } = useVariableCosts();
  const { appointments } = useAppointments();
  const { clients } = useClients();
  const { services } = useServices();

  const metrics = useMemo(() => {
    const fixedCosts = calculateTotalFixedCosts();
    const variablePercentage = calculateTotalPercentage(monthlyRevenue.total);
    return calculateMetrics(variablePercentage, fixedCosts);
  }, [calculateMetrics, calculateTotalFixedCosts, calculateTotalPercentage, monthlyRevenue.total]);

  // Simulated previous month for trend (in production, fetch real data)
  const trendData = useMemo(() => {
    const revenue = metrics.revenue;
    const prevRevenue = revenue * 0.85; // placeholder
    const revenueTrend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    const ticket = metrics.completedAppointments > 0 ? revenue / metrics.completedAppointments : 0;
    const prevTicket = ticket * 0.92;
    const ticketTrend = prevTicket > 0 ? ((ticket - prevTicket) / prevTicket) * 100 : 0;

    const attendances = metrics.completedAppointments;
    const prevAttendances = Math.max(attendances - 3, 0);
    const attendanceTrend = prevAttendances > 0 ? ((attendances - prevAttendances) / prevAttendances) * 100 : 0;

    const profit = metrics.netProfit;
    const prevProfit = profit * 0.88;
    const profitTrend = prevProfit !== 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : 0;

    return { revenueTrend, ticketTrend, attendanceTrend, profitTrend };
  }, [metrics]);

  const stats = useMemo(() => [
    {
      label: "Faturamento",
      value: formatCurrency(metrics.revenue),
      icon: DollarSign,
      trend: trendData.revenueTrend,
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(metrics.completedAppointments > 0 ? metrics.revenue / metrics.completedAppointments : 0),
      icon: TrendingUp,
      trend: trendData.ticketTrend,
      iconBg: "bg-sky-500/15",
      iconColor: "text-sky-400",
    },
    {
      label: "Atendimentos",
      value: String(metrics.completedAppointments),
      icon: Calendar,
      trend: trendData.attendanceTrend,
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400",
    },
    {
      label: "Lucro Estimado",
      value: formatCurrency(metrics.netProfit),
      icon: TrendingUp,
      trend: trendData.profitTrend,
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-400",
    },
  ], [metrics, trendData]);

  const todayAppointments = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return appointments
      .filter((a) => a.appointment_date === today && a.status !== 'cancelado')
      .sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''));
  }, [appointments]);

  const revenueChartData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = format(d, 'MMM', { locale: ptBR });
      months.push({ month: label, receita: 0 });
    }
    if (months.length > 0) {
      months[months.length - 1].receita = metrics.revenue;
    }
    return months;
  }, [metrics.revenue]);

  const isOnboardingComplete = useMemo(() => {
    return services.length > 0 && clients.length > 0;
  }, [services, clients]);

  useEffect(() => {
    const checkoutResult = searchParams.get("checkout");
    if (checkoutResult === "success") {
      toast({
        title: "Pagamento confirmado! 🎉",
        description: "Bem-vindo ao DetailerOS! Sua assinatura está ativa.",
      });
      setTimeout(() => checkSubscription(), 1000);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams, toast, checkSubscription]);

  const getAIInteractionsLabel = () => {
    if (!profile) return "";
    if (profile.ai_interactions_limit === -1) return "Ilimitado";
    return `${profile.ai_interactions_used}/${profile.ai_interactions_limit}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Trial Banner */}
      {isTrialActive(profile) && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">
                🎉 Teste gratuito — {getTrialDaysRemaining(profile)} dia{getTrialDaysRemaining(profile) !== 1 ? 's' : ''} restante{getTrialDaysRemaining(profile) !== 1 ? 's' : ''}
              </p>
              <Progress value={((14 - getTrialDaysRemaining(profile)) / 14) * 100} className="mt-2 h-2" />
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to="/planos">Assinar agora</Link>
            </Button>
          </div>
        </motion.div>
      )}

      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              Olá, {profile?.name?.split(" ")[0] || "Usuário"}! 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Resumo do seu negócio este mês
            </p>
          </div>
          <Button
            variant="ghost" size="icon"
            onClick={() => { checkSubscription(); refetch(); }}
            disabled={isCheckingSubscription || isLoadingFinancial}
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingSubscription || isLoadingFinancial ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards - generous height */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className="border-border/50 bg-card hover:shadow-md transition-all hover:border-border">
              <CardContent className="p-5 sm:p-6">
                <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center mb-4`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display truncate">{stat.value}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                    stat.trend >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {stat.trend >= 0
                      ? <ArrowUpRight className="w-3.5 h-3.5" />
                      : <ArrowDownRight className="w-3.5 h-3.5" />
                    }
                    {Math.abs(stat.trend).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Two columns: Bar Chart + Today's agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-3">
          <Card className="border-border/50 h-full">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-base sm:text-lg">Faturamento (6 meses)</h3>
                <DollarSign className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueChartData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Receita']}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                    cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                  />
                  <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2">
          <Card className="border-border/50 h-full">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-base sm:text-lg">Hoje</h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/agenda" className="text-xs text-primary">Ver agenda</Link>
                </Button>
              </div>
              {todayAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum agendamento hoje</p>
                  <Button size="sm" variant="outline" className="mt-3" asChild>
                    <Link to="/agenda">Agendar</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {todayAppointments.slice(0, 8).map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/30">
                      <div className="w-1 h-9 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{apt.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{apt.service_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-primary">{apt.appointment_time?.slice(0, 5) || '--:--'}</p>
                        <p className="text-[11px] text-muted-foreground">{formatCurrency(apt.service_value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom: Sócio IA compact + Onboarding conditional */}
      <div className={`grid grid-cols-1 ${!isOnboardingComplete ? 'lg:grid-cols-2' : ''} gap-4`}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-primary/15 bg-card overflow-hidden">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm">Sócio IA</h3>
                <p className="text-[11px] text-muted-foreground">{getAIInteractionsLabel()} interações</p>
              </div>
              <Button size="sm" variant="outline" asChild className="shrink-0 border-primary/30 text-primary hover:bg-primary/10">
                <Link to="/socio-ia">Conversar</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {!isOnboardingComplete && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold text-sm mb-3">Comece por aqui</h3>
                <div className="grid grid-cols-2 gap-2">
                  {services.length === 0 && (
                    <Button variant="outline" size="sm" className="justify-start text-xs" asChild>
                      <Link to="/servicos"><Wrench className="w-3.5 h-3.5 mr-1.5" />Cadastrar serviços</Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="justify-start text-xs" asChild>
                    <Link to="/financeiro"><DollarSign className="w-3.5 h-3.5 mr-1.5" />Custos e metas</Link>
                  </Button>
                  {clients.length === 0 && (
                    <Button variant="outline" size="sm" className="justify-start text-xs" asChild>
                      <Link to="/clientes"><Users className="w-3.5 h-3.5 mr-1.5" />Primeiro cliente</Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="justify-start text-xs" asChild>
                    <Link to="/agenda"><Calendar className="w-3.5 h-3.5 mr-1.5" />Agendar atendimento</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
