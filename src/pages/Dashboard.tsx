import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  CreditCard,
  Loader2,
  RefreshCw,
  Wrench,
  Upload
} from "lucide-react";
import { Shield } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, isTrialActive, getTrialDaysRemaining } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useFixedCosts } from "@/hooks/useFixedCosts";
import { useVariableCosts } from "@/hooks/useVariableCosts";
import logo from "@/assets/logo.jpeg";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const Dashboard = () => {
  const { user, profile, session, signOut, checkSubscription, isCheckingSubscription } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const { monthlyRevenue, isLoading: isLoadingFinancial, calculateMetrics, refetch } = useFinancialData();
  const { calculateTotalFixedCosts } = useFixedCosts();
  const { calculateTotalPercentage } = useVariableCosts();

  const metrics = useMemo(() => {
    const fixedCosts = calculateTotalFixedCosts();
    const variablePercentage = calculateTotalPercentage(monthlyRevenue.total);
    return calculateMetrics(variablePercentage, fixedCosts);
  }, [calculateMetrics, calculateTotalFixedCosts, calculateTotalPercentage, monthlyRevenue.total]);

  const stats = useMemo(() => [
    {
      label: "Faturamento do Mês",
      value: formatCurrency(metrics.revenue),
      icon: DollarSign,
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(
        metrics.completedAppointments > 0 ? metrics.revenue / metrics.completedAppointments : 0
      ),
      icon: TrendingUp,
    },
    {
      label: "Atendimentos",
      value: String(metrics.completedAppointments),
      icon: Calendar,
    },
    {
      label: "Lucro Estimado",
      value: formatCurrency(metrics.netProfit),
      trend: metrics.netProfit >= 0 ? "up" : "down",
      icon: TrendingUp,
    },
  ], [metrics]);

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

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleManageSubscription = async () => {
    if (!session?.access_token) return;
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error) {
      console.error("Portal error:", error);
      toast({ title: "Erro", description: "Não foi possível abrir o portal de assinatura.", variant: "destructive" });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const getPlanLabel = (plan: string | undefined) => {
    switch (plan) {
      case "base": return "Base";
      case "gestao": return "Gestão";
      case "escala": return "Escala";
      default: return "Sem plano";
    }
  };

  const getAIInteractionsLabel = () => {
    if (!profile) return "";
    if (profile.ai_interactions_limit === -1) return "Ilimitado";
    return `${profile.ai_interactions_used}/${profile.ai_interactions_limit}`;
  };

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
            <Button variant="default" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
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
            <Button variant="ghost" size="sm" asChild>
              <Link to="/orcamentos">Orçamentos</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/vendas">Vendas</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/campanhas">Campanhas</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/estoque">Estoque</Link>
            </Button>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/socio-ia">
                <Bot className="w-4 h-4 mr-1" />
                Sócio IA
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/importar-dados">
                <Upload className="w-4 h-4 mr-1" />
                Importar
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/configuracoes">
                <Wrench className="w-4 h-4 mr-1" />
                Config.
              </Link>
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin" className="text-primary">
                  <Shield className="w-4 h-4 mr-1" />
                  Admin
                </Link>
              </Button>
            )}
          </nav>

          {/* Notifications + User menu */}
          <div className="flex items-center gap-1">
          <NotificationBell />
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
                <p className="text-xs text-primary mt-1">Plano {getPlanLabel(profile?.plan)}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleManageSubscription} disabled={isOpeningPortal}>
                {isOpeningPortal ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Gerenciar assinatura
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/planos">Alterar plano</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-8">
        {/* Trial Banner */}
        {isTrialActive(profile) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-primary/10 border border-primary/20 rounded-xl p-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">
                  🎉 Período de teste gratuito — {getTrialDaysRemaining(profile)} dia{getTrialDaysRemaining(profile) !== 1 ? 's' : ''} restante{getTrialDaysRemaining(profile) !== 1 ? 's' : ''}
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">
                Olá, {profile?.name?.split(" ")[0] || "Usuário"}! 👋
              </h1>
              <p className="text-muted-foreground">
                Aqui está o resumo do seu negócio este mês.
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { checkSubscription(); refetch(); }}
              disabled={isCheckingSubscription || isLoadingFinancial}
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingSubscription || isLoadingFinancial ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border rounded-xl p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                {stat.trend && (
                  <span className={`inline-flex items-center text-xs sm:text-sm font-medium ${
                    stat.trend === "up" ? "text-success" : "text-destructive"
                  }`}>
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                  </span>
                )}
              </div>
              <p className="text-lg sm:text-2xl font-bold font-display mb-1 truncate">{stat.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* AI Partner CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-primary rounded-2xl p-6 sm:p-8 shadow-accent-glow"
          >
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
                <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="font-display text-lg sm:text-2xl font-bold text-primary-foreground mb-2">
                  Fale com seu Sócio IA
                </h2>
                <p className="text-primary-foreground/80 text-sm mb-4 sm:mb-0">
                  Interações: {getAIInteractionsLabel()}
                </p>
              </div>
              <Button 
                size="lg" 
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shrink-0 w-full sm:w-auto"
                asChild
              >
                <Link to="/socio-ia">Conversar</Link>
              </Button>
            </div>
          </motion.div>

          {/* Quick Start */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-2xl p-6 sm:p-8"
          >
            <h3 className="font-display text-lg font-bold mb-4">Comece por aqui</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/servicos">
                  <Wrench className="w-4 h-4 mr-2" />
                  Cadastrar seus serviços
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/financeiro">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Cadastrar custos e metas
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/clientes">
                  <Calendar className="w-4 h-4 mr-2" />
                  Cadastrar primeiro cliente
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/agenda">
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar um atendimento
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
