import { motion } from "framer-motion";
import { Bot, Sparkles, TrendingUp, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const SocioIA = () => {
  return (
    <section id="socio-ia" className="py-24 lg:py-32 relative overflow-hidden" style={{ background: '#0F0F0F' }}>
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/6 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left content */}
          <div>
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs font-semibold tracking-widest text-primary uppercase mb-4 block"
            >
              Diferencial exclusivo
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
            >
              Seu sócio que{" "}
              <span className="text-gradient-primary">nunca dorme.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-lg leading-relaxed mb-8"
            >
              O Sócio IA analisa os dados reais do seu negócio, identifica oportunidades, sugere ações concretas e responde suas dúvidas sobre gestão — como ter um consultor especializado disponível 24 horas.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-4 mb-10"
            >
              {[
                { icon: Brain, text: "Analisa faturamento, custos e margem de lucro" },
                { icon: TrendingUp, text: "Sugere ações para aumentar retenção e ticket médio" },
                { icon: Sparkles, text: "Responde dúvidas sobre precificação e estratégia" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{item.text}</span>
                </div>
              ))}
            </motion.div>

            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-14 px-8 rounded-xl">
              <Link to="/cadastro">Experimentar o Sócio IA</Link>
            </Button>
          </div>

          {/* Right — Chat mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-[#1a1a1a] p-6"
            style={{ background: '#111111' }}
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1a1a1a]">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm text-foreground">Sócio IA</p>
                <p className="text-xs text-primary">Online agora</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* User message */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 bg-primary/10 border border-primary/20">
                  <p className="text-sm text-foreground">Quanto preciso faturar por dia pra cobrir meus custos?</p>
                </div>
              </div>
              {/* AI response */}
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 border border-[#1a1a1a]" style={{ background: '#0A0A0A' }}>
                  <p className="text-sm text-foreground leading-relaxed">
                    Com base nos seus custos fixos de <span className="text-primary font-semibold">R$ 8.200</span> e custos variáveis médios de <span className="text-primary font-semibold">18%</span>, seu ponto de equilíbrio diário é de <span className="text-primary font-semibold">R$ 456</span> considerando 22 dias úteis. Hoje você está faturando em média R$ 520/dia — margem positiva de 14%. 👍
                  </p>
                </div>
              </div>
              {/* User message */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 bg-primary/10 border border-primary/20">
                  <p className="text-sm text-foreground">Quais clientes eu deveria contatar essa semana?</p>
                </div>
              </div>
              {/* AI response */}
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 border border-[#1a1a1a]" style={{ background: '#0A0A0A' }}>
                  <p className="text-sm text-foreground leading-relaxed">
                    Identifiquei <span className="text-primary font-semibold">7 clientes</span> que não retornam há mais de 30 dias. Recomendo priorizar Marcos Oliveira (Porsche 911) e Felipe Souza (Mercedes C300) — ambos com ticket médio acima de R$ 800.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
