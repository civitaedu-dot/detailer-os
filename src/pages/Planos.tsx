import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Crown, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
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
    name: "Escala",
    icon: Crown,
    price: "397",
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
  const handleSelectPlan = (planName: string) => {
    // TODO: Implement Stripe checkout
    console.log("Selected plan:", planName);
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-12 px-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 max-w-6xl mx-auto">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        {/* Header */}
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
        </motion.div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? "bg-gradient-primary shadow-accent-glow scale-105"
                  : "bg-card border border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-accent-foreground text-sm font-semibold rounded-full">
                  Mais Popular
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
                onClick={() => handleSelectPlan(plan.name)}
                variant={plan.popular ? "glass" : "hero"}
                className={`w-full ${plan.popular ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""}`}
              >
                Assinar {plan.name}
              </Button>
            </motion.div>
          ))}
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