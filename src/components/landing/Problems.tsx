import { motion } from "framer-motion";
import { UserX, PackageX, CircleDollarSign, CalendarX } from "lucide-react";

const problems = [
  {
    icon: UserX,
    title: "Cliente some e ninguém percebe",
    description: "Sem controle de retenção, você só descobre que perdeu o cliente quando ele já foi pro concorrente.",
  },
  {
    icon: PackageX,
    title: "Estoque no achismo",
    description: "Produto acaba no meio do serviço, compra duplicada, sem saber o custo real por aplicação.",
  },
  {
    icon: CircleDollarSign,
    title: "Não sabe quanto está ganhando de verdade",
    description: "Fatura R$ 15 mil mas não sabe se sobrou R$ 3 mil ou R$ 300. Zero clareza financeira.",
  },
  {
    icon: CalendarX,
    title: "Agenda bagunçada no WhatsApp",
    description: "Mensagens perdidas, horários duplicados, cliente esperando resposta que nunca chega.",
  },
];

export const Problems = () => {
  return (
    <section className="py-24 lg:py-32" style={{ background: '#0A0A0A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-widest text-primary uppercase mb-4 block"
          >
            O problema
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl sm:text-4xl font-bold mb-4"
          >
            Se identificou com algum desses?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            São as dores mais comuns de quem toca uma estética automotiva sem sistema.
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative rounded-2xl border border-[#1a1a1a] p-8 hover:border-destructive/30 transition-colors duration-300"
              style={{ background: '#111111' }}
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-5">
                <problem.icon className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2 text-foreground">{problem.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{problem.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
