import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const plan = {
  name: "Plano Gestão Refinada",
  price: "49,99",
  description: "Tudo da plataforma liberado, sem limites.",
  features: [
    "Agenda completa de atendimentos",
    "Cadastro de clientes e veículos",
    "Financeiro completo + DRE automática",
    "Controle de estoque e custos",
    "Aba de Vendas, Retenção e Campanhas",
    "Precificação assistida e valor-hora",
    "Orçamentos profissionais em PDF",
    "Sócio IA ilimitado",
  ],
};

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

        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-2xl p-8 flex flex-col border-2 border-primary shadow-glow"
            style={{ background: '#111111' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/15">
                <Sparkles className="w-5 h-5 text-primary" />
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
              className="w-full rounded-xl font-bold h-12 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/cadastro">Começar agora</Link>
            </Button>
          </motion.div>
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
