import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Zap, Sparkles, Crown } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Base",
    icon: Zap,
    price: "97",
    description: "Para começar a organizar sua operação",
    features: [
      "Agenda de atendimentos",
      "Cadastro de clientes e veículos",
      "Controle financeiro básico",
      "Importação de dados",
      "Sócio IA: 5 interações/mês",
    ],
    popular: false,
  },
  {
    name: "Gestão",
    icon: Sparkles,
    price: "197",
    description: "Gestão profissional completa do negócio",
    features: [
      "Tudo do plano Base",
      "Financeiro avançado + DRE",
      "Controle de estoque com custo por uso",
      "Aba de Vendas e Retenção",
      "Campanhas via WhatsApp",
      "Relatórios de desempenho",
      "Sócio IA: 10 interações/mês",
    ],
    popular: true,
  },
  {
    name: "Escala",
    icon: Crown,
    price: "297",
    description: "Máxima clareza para escalar",
    features: [
      "Tudo dos planos anteriores",
      "Precificação assistida por serviço",
      "Lucro real por atendimento",
      "Valor da hora trabalhada",
      "Orçamentos profissionais em PDF",
      "Sócio IA ilimitado",
    ],
    popular: false,
  },
];

export const Pricing = () => {
  return (
    <section id="planos" className="py-24 lg:py-32" style={{ background: '#0A0A0A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-widest text-primary uppercase mb-4 block"
          >
            Planos
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl sm:text-4xl font-bold mb-4"
          >
            Escolha o plano ideal para seu{" "}
            <span className="text-gradient-primary">momento</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? "border-2 border-primary shadow-glow"
                  : "border border-[#1a1a1a]"
              }`}
              style={{ background: plan.popular ? '#111111' : '#0F0F0F' }}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  Mais escolhido
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.popular ? 'bg-primary/15' : 'bg-[#1a1a1a]'}`}>
                  <plan.icon className={`w-5 h-5 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <h3 className="font-display font-bold text-lg">{plan.name}</h3>
              </div>

              <div className="mb-2">
                <span className="font-display text-4xl font-bold">R${plan.price}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8">{plan.description}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                className={`w-full rounded-xl font-bold h-12 ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-[#1a1a1a] text-foreground hover:bg-[#222] border border-[#333]"
                }`}
              >
                <Link to="/cadastro">Começar com {plan.name}</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mt-10"
        >
          Sem fidelidade. Cancele quando quiser. Todos os planos incluem suporte.
        </motion.p>
      </div>
    </section>
  );
};
