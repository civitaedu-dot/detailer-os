import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
  RefreshCw
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const stats = [
  {
    label: "Faturamento do Mês",
    value: "R$ 0",
    change: "0%",
    trend: "up",
    icon: DollarSign,
  },
  {
    label: "Ticket Médio",
    value: "R$ 0",
    change: "0%",
    trend: "up",
    icon: TrendingUp,
  },
  {
    label: "Atendimentos",
    value: "0",
    change: "0%",
    trend: "up",
    icon: Calendar,
  },
  {
    label: "Lucro Estimado",
    value: "R$ 0",
    change: "0%",
    trend: "up",
    icon: TrendingUp,
  },
];

const Dashboard = () => {
  const { user, profile, session, signOut, checkSubscription, isCheckingSubscription } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Handle successful checkout
  useEffect(() => {
    const checkoutResult = searchParams.get("checkout");
    if (checkoutResult === "success") {
      toast({
        title: "Pagamento confirmado! 🎉",
        description: "Bem-vindo ao DetailerOS! Sua assinatura está ativa.",
      });
      // Refresh subscription status
      checkSubscription();
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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o portal de assinatura.",
        variant: "destructive",
      });
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
    if (profile.ai_interactions_limit === -1) {
      return "Ilimitado";
    }
    return `${profile.ai_interactions_used}/${profile.ai_interactions_limit}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-sm">D</span>
              </div>
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
              <Link to="/socio-ia">Sócio IA</Link>
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
      </header>

      <main className="container px-4 sm:px-6 py-8">
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
              onClick={() => checkSubscription()}
              disabled={isCheckingSubscription}
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingSubscription ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <span className={`inline-flex items-center text-sm font-medium ${
                  stat.trend === "up" ? "text-success" : "text-destructive"
                }`}>
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold font-display mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
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
            className="bg-gradient-primary rounded-2xl p-8 shadow-accent-glow"
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
                <Bot className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-primary-foreground mb-2">
                  Fale com seu Sócio IA
                </h2>
                <p className="text-primary-foreground/80 text-sm mb-4 sm:mb-0">
                  Interações: {getAIInteractionsLabel()}
                </p>
              </div>
              <Button 
                size="lg" 
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shrink-0"
                asChild
              >
                <Link to="/socio-ia">
                  Conversar
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Quick Start */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-2xl p-8"
          >
            <h3 className="font-display text-lg font-bold mb-4">Comece por aqui</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/financeiro">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Cadastrar custos e faturamento
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
