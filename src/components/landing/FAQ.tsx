import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "É difícil de configurar? Quanto tempo leva?",
    a: "Em menos de 10 minutos você já está com a plataforma rodando. Basta criar a conta, cadastrar seus serviços e começar a agendar. É intuitivo e direto ao ponto.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim, 100%. A plataforma é totalmente responsiva e funciona perfeitamente em qualquer celular, tablet ou computador. Você gerencia tudo de onde estiver.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Utilizamos infraestrutura de nível empresarial com criptografia ponta a ponta, backups automáticos e acesso protegido por autenticação segura. Seus dados são só seus.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Sem fidelidade, sem multa, sem burocracia. Cancele quando quiser diretamente na plataforma com dois cliques.",
  },
  {
    q: "Como funciona o Sócio IA?",
    a: "O Sócio IA analisa os dados reais da sua estética — faturamento, custos, clientes, retenção — e responde suas perguntas com insights e sugestões personalizadas. É como ter um consultor disponível 24h.",
  },
  {
    q: "Consigo importar meus dados de planilhas?",
    a: "Sim. A plataforma aceita arquivos Excel e CSV. Basta fazer upload, mapear as colunas e pronto — seus clientes e dados financeiros são importados automaticamente.",
  },
  {
    q: "Tem suporte se eu tiver dúvidas?",
    a: "Sim. Oferecemos suporte via chat e WhatsApp para todos os planos. Além disso, o próprio Sócio IA responde dúvidas sobre como usar a plataforma.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="py-24 lg:py-32" style={{ background: '#0A0A0A' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-widest text-primary uppercase mb-4 block"
          >
            Perguntas frequentes
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl sm:text-4xl font-bold"
          >
            Tire suas dúvidas
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-[#1a1a1a] px-6 data-[state=open]:border-primary/30 transition-colors"
                style={{ background: '#111111' }}
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-primary py-5 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
