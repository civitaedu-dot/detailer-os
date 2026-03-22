import { motion } from "framer-motion";
import { Users, CalendarCheck, Star, TrendingUp } from "lucide-react";

const stats = [
  { icon: Users, value: "2.500+", label: "Clientes gerenciados" },
  { icon: CalendarCheck, value: "12.000+", label: "Atendimentos registrados" },
  { icon: Star, value: "4.9", label: "Avaliação média" },
  { icon: TrendingUp, value: "35%", label: "Aumento médio no faturamento" },
];

export const SocialProof = () => {
  return (
    <section className="relative py-16 border-y border-[#1a1a1a]" style={{ background: '#0F0F0F' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-3" />
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
