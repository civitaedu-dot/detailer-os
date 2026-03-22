import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rafael Teixeira",
    city: "São Paulo, SP",
    avatar: "RT",
    text: "Antes eu achava que estava lucrando. Depois do DetailerOS descobri que 3 dos meus serviços davam prejuízo. Ajustei a precificação e meu lucro subiu 40% em dois meses.",
  },
  {
    name: "Diego Ferreira",
    city: "Curitiba, PR",
    avatar: "DF",
    text: "O Sócio IA me mostrou que eu tinha 23 clientes inativos que eu nem percebi. Fiz uma campanha de reativação e 9 voltaram na mesma semana. Ferramenta absurda.",
  },
  {
    name: "Thiago Nascimento",
    city: "Belo Horizonte, MG",
    avatar: "TN",
    text: "Saí do WhatsApp bagunçado pra uma agenda organizada com controle de estoque e financeiro real. Minha estética virou um negócio de verdade. Recomendo de olhos fechados.",
  },
];

export const Testimonials = () => {
  return (
    <section id="depoimentos" className="py-24 lg:py-32" style={{ background: '#0F0F0F' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-widest text-primary uppercase mb-4 block"
          >
            Depoimentos
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl sm:text-4xl font-bold"
          >
            Quem usa, recomenda.
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-[#1a1a1a] p-8"
              style={{ background: '#111111' }}
            >
              <Quote className="w-8 h-8 text-primary/30 mb-4" />
              <p className="text-sm text-foreground leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-[#1a1a1a]">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.city}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
