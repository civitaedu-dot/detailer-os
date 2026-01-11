import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Calculator, 
  Calendar, 
  Users, 
  Bot, 
  BarChart3,
  DollarSign,
  Target
} from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Clareza Financeira Total",
    description: "Saiba exatamente quanto você lucra. Visualize faturamento, custos e margem em tempo real.",
  },
  {
    icon: Calculator,
    title: "DRE Automática",
    description: "Demonstrativo de resultados gerado automaticamente. Entenda seus números sem planilhas complexas.",
  },
  {
    icon: Target,
    title: "Ponto de Equilíbrio",
    description: "Descubra quanto precisa faturar por dia para cobrir seus custos e começar a lucrar.",
  },
  {
    icon: Calendar,
    title: "Agenda Integrada",
    description: "Cadastre serviços e atendimentos. Tudo conectado automaticamente ao seu financeiro.",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Histórico completo de cada cliente: veículos, serviços realizados e preferências.",
  },
  {
    icon: Bot,
    title: "Sócio IA Estratégico",
    description: "Um consultor especializado em estética automotiva disponível 24h para ajudar suas decisões.",
  },
  {
    icon: DollarSign,
    title: "Precificação Assistida",
    description: "Calcule o preço ideal baseado em tempo, custo e margem desejada. Sem achismos.",
  },
  {
    icon: BarChart3,
    title: "Relatórios de Desempenho",
    description: "Acompanhe a evolução do seu negócio com métricas claras e acionáveis.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export const Features = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container relative z-10 px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-primary font-semibold mb-4"
          >
            FUNCIONALIDADES
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
          >
            Tudo que você precisa para{" "}
            <span className="text-gradient-primary">crescer</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            Gestão profissional, clareza financeira e inteligência artificial 
            em uma única plataforma pensada para estéticas automotivas.
          </motion.p>
        </div>

        {/* Features grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};