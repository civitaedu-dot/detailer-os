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
import { format, startOfDay, endOfDay, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const KPI_COLORS = [
  { bg: "bg-emerald-500/10", icon: "text-emerald-400", border: "border-emerald-500/20" },
  { bg: "bg-sky-500/10", icon: "text-sky-400", border: "border-sky-500/20" },
  { bg: "bg-amber-500/10", icon: "text-amber-400", border: "border-amber-500/20" },
  { bg: "bg-violet-500/10", icon: "text-violet-400", border: "border-violet-500/20" },
];

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

  const stats = useMemo(() => [
    {
      label: "Faturamento",
      value: formatCurrency(metrics.revenue),
      icon: DollarSign,
      color: KPI_COLORS[0],
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(metrics.completedAppointments > 0 ? metrics.revenue / metrics.completedAppointments : 0),
      icon: TrendingUp,
      color: KPI_COLORS[1],
    },
    {
      label: "Atendimentos",
      value: String(metrics.completedAppointments),
      icon: Calendar,
      color: KPI_COLORS[2],
    },
    {
      label: "Lucro Estimado",
      value: formatCurrency(metrics.netProfit),
      trend: metrics.netProfit >= 0 ? "up" : "down",
      icon: TrendingUp,
      color: KPI_COLORS[3],
    },
  ], [metrics]);

  // Today's appointments
  const todayAppointments = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return appointments
      .filter((a) => a.appointment_date === today && a.status !== 'cancelado')
      .sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''));
  }, [appointments]);

  // Revenue chart data (last 6 months) from monthlyRevenue
  const revenueChartData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = format(d, 'MMM', { locale: ptBR });
      months.push({ month: label, receita: 0 });
    }
    // Current month is the last item
    if (months.length > 0) {
      months[months.length - 1].receita = metrics.revenue;
    }
    return months;
  }, [metrics.revenue]);

  // Check if onboarding is complete
  const isOnboardingComplete = useMemo(() => {
    return services.length > 0 && clients.length > 0;
  }, [services, clients]);

  // Handle successful checkout
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8">
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

      {/* Welcome + Refresh */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              Olá, {profile?.name?.split(" ")[0] || "Usuário"}! 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className={`border ${stat.color.border} bg-card hover:shadow-md transition-shadow`}>
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${stat.color.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color.icon}`} />
                  </div>
                  {stat.trend && (
                    <span className={`inline-flex items-center text-xs font-semibold ${
                      stat.trend === "up" ? "text-emerald-400" : "text-destructive"
                    }`}>
                      {stat.trend === "up" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </span>
                  )}
                </div>
                <p className="text-xl sm:text-2xl font-bold font-display truncate">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Two columns: Chart + Today's agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Revenue Chart - 3/5 width */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-3">
          <Card className="border-border/50 h-full">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-base sm:text-lg">Faturamento (6 meses)</h3>
                <DollarSign className="w-5 h-5 text-muted-foreground" />
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Receita']}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Appointments - 2/5 width */}
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
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum agendamento hoje</p>
                  <Button size="sm" variant="outline" className="mt-3" asChild>
                    <Link to="/agenda">Agendar</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {todayAppointments.slice(0, 6).map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 border border-border/30">
                      <div className="w-1.5 h-8 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{apt.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{apt.service_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-primary">{apt.appointment_time?.slice(0, 5) || '--:--'}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(apt.service_value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom row: Sócio IA card + Onboarding (conditional) */}
      <div className={`grid grid-cols-1 ${!isOnboardingComplete ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6`}>
        {/* Sócio IA - compact */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 overflow-hidden">
            <CardContent className="p-4 sm:p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-accent-glow">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm sm:text-base">Sócio IA</h3>
                <p className="text-xs text-muted-foreground">Interações: {getAIInteractionsLabel()}</p>
              </div>
              <Button size="sm" asChild className="shrink-0">
                <Link to="/socio-ia">Conversar</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Onboarding - only if incomplete */}
        {!isOnboardingComplete && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="border-border/50">
              <CardContent className="p-4 sm:p-5">
                <h3 className="font-display font-semibold text-sm sm:text-base mb-3">Comece por aqui</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {services.length === 0 && (
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                      <Link to="/servicos"><Wrench className="w-4 h-4 mr-2" />Cadastrar serviços</Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="justify-start" asChild>
                    <Link to="/financeiro"><DollarSign className="w-4 h-4 mr-2" />Custos e metas</Link>
                  </Button>
                  {clients.length === 0 && (
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                      <Link to="/clientes"><Users className="w-4 h-4 mr-2" />Primeiro cliente</Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="justify-start" asChild>
                    <Link to="/agenda"><Calendar className="w-4 h-4 mr-2" />Agendar atendimento</Link>
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
