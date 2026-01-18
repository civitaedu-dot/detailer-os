import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Crown, ArrowLeft, Loader2, LogOut } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS, PlanId } from "@/lib/stripe-plans";

const plans = [
  {
    id: "base" as PlanId,
    name: "Base",
    icon: Zap,
    price: "97",
    description: "Perfeito para começar a organizar sua estética",
    features: [
      "Agenda de atendimentos",
      "Cadastro de clientes",
      "Controle financeiro básico",
      "Sócio IA: 5 interações/mês",
    ],
    popular: false,
  },
  {
    id: "gestao" as PlanId,
    name: "Gestão",
    icon: Sparkles,
    price: "197",
    description: "Para quem quer gestão profissional completa",
    features: [
      "Tudo do plano Base",
      "Financeiro avançado",
      "DRE automática",
      "Relatórios de desempenho",
      "Sócio IA: 10 interações/mês",
    ],
    popular: true,
  },
  {
    id: "escala" as PlanId,
    name: "Escala",
    icon: Crown,
    price: "297",
    description: "Máxima clareza para escalar seu negócio",
    features: [
      "Tudo dos planos anteriores",
      "Custo por serviço",
      "Tempo médio por serviço",
      "Lucro por serviço",
      "Valor da hora trabalhada",
      "Precificação assistida",
      "Sócio IA ilimitado",
    ],
    popular: false,
  },
];

const Planos = () => {
  const { user, profile, session, signOut, checkSubscription, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Handle checkout result
  useEffect(() => {
    const checkoutResult = searchParams.get("checkout");
    if (checkoutResult === "cancelled") {
      toast({
        title: "Pagamento cancelado",
        description: "Você cancelou o processo de pagamento. Escolha um plano para continuar.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  // Redirect to cadastro if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/cadastro", { replace: true });
    }
  }, [isLoading, user, navigate]);

  // Redirect to dashboard if already has active plan
  useEffect(() => {
    if (!isLoading && profile?.plan_status === "active") {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, profile, navigate]);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!user || !session) {
      navigate("/cadastro");
      return;
    }

    setLoadingPlan(planId);

    try {
      const plan = STRIPE_PLANS[planId];
      
      console.log("[Planos] Creating checkout for plan:", planId, plan.priceId);
      
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: plan.priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("[Planos] Checkout error:", error);
        throw error;
      }

      if (data?.url) {
        console.log("[Planos] Redirecting to checkout:", data.url);
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("[Planos] Checkout error:", error);
      toast({
        title: "Erro ao processar pagamento",
        description: "Não foi possível iniciar o checkout. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const currentPlan = profile?.plan;
  const isActivePlan = profile?.plan_status === "active";

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Don't render if not logged in (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-12 px-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Header content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-xl">D</span>
            </div>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Escolha seu plano
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Para acessar o DetailerOS, escolha o plano que melhor atende seu momento. 
            Você pode trocar de plano a qualquer momento.
          </p>
          <p className="text-sm text-primary mt-4">
            Logado como: {profile?.name || user.email}
          </p>
        </motion.div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => {
            const isCurrentPlan = currentPlan === plan.id && isActivePlan;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? "bg-gradient-primary shadow-accent-glow scale-105"
                    : "bg-card border border-border"
                } ${isCurrentPlan ? "ring-2 ring-accent ring-offset-2" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-accent-foreground text-sm font-semibold rounded-full">
                    Mais Popular
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                    Seu Plano
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    plan.popular ? "bg-primary-foreground/20" : "bg-secondary"
                  }`}>
                    <plan.icon className={`w-5 h-5 ${plan.popular ? "text-primary-foreground" : "text-primary"}`} />
                  </div>
                  <h3 className={`font-display font-bold text-xl ${plan.popular ? "text-primary-foreground" : ""}`}>
                    {plan.name}
                  </h3>
                </div>

                <div className="mb-4">
                  <span className={`text-4xl font-bold font-display ${plan.popular ? "text-primary-foreground" : ""}`}>
                    R${plan.price}
                  </span>
                  <span className={`text-sm ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    /mês
                  </span>
                </div>

                <p className={`text-sm mb-6 ${plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className={`w-5 h-5 shrink-0 ${
                        plan.popular ? "text-primary-foreground" : "text-primary"
                      }`} />
                      <span className={`text-sm ${plan.popular ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  variant={plan.popular ? "glass" : "hero"}
                  className={`w-full ${plan.popular ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""}`}
                  disabled={loadingPlan === plan.id || isCurrentPlan}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : isCurrentPlan ? (
                    "Plano Ativo"
                  ) : (
                    `Assinar ${plan.name}`
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-12"
        >
          Pagamento seguro via Stripe. Cancele quando quiser.
        </motion.p>
      </div>
    </div>
  );
};

export default Planos;
