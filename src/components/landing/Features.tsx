import { motion } from "framer-motion";
import { useState } from "react";
import {
  CalendarDays,
  Users,
  Package,
  TrendingUp,
  MessageCircle,
  Bot,
} from "lucide-react";

const features = [
  {
    id: "agenda",
    icon: CalendarDays,
    title: "Agenda inteligente",
    description: "Visualização diária, semanal e mensal. Planeje até 3 meses à frente com indicadores de disponibilidade.",
    mockup: [
      { time: "09:00", client: "João Silva", service: "PPF Frontal", status: "confirmed" },
      { time: "11:00", client: "Carlos Mendes", service: "Polimento", status: "confirmed" },
      { time: "14:00", client: "Ana Costa", service: "Vitrificação", status: "pending" },
    ],
  },
  {
    id: "clientes",
    icon: Users,
    title: "Gestão de Clientes",
    description: "Histórico completo: veículos, serviços, frequência, valor gerado. Saiba exatamente quem está sumindo.",
    mockup: [
      { name: "Roberto Lima", vehicle: "BMW X5", lastVisit: "há 12 dias", status: "active" },
      { name: "Marcos Oliveira", vehicle: "Porsche 911", lastVisit: "há 35 dias", status: "risk" },
      { name: "Felipe Souza", vehicle: "Mercedes C300", lastVisit: "há 60 dias", status: "lost" },
    ],
  },
  {
    id: "estoque",
    icon: Package,
    title: "Controle de Estoque",
    description: "Custo por uso calculado automaticamente. Saiba quanto cada serviço consome de insumo e sua margem real.",
    mockup: [
      { product: "Cera Carnaúba Premium", stock: 8, min: 5, costPerUse: "R$ 12,50" },
      { product: "Shampoo Neutro 5L", stock: 3, min: 5, costPerUse: "R$ 4,00" },
      { product: "Película PPF Metro", stock: 15, min: 10, costPerUse: "R$ 85,00" },
    ],
  },
  {
    id: "vendas",
    icon: TrendingUp,
    title: "Vendas e Retenção",
    description: "Taxa de retenção, clientes em risco, ticket médio e evolução da carteira. Dados reais para crescer.",
    mockup: null,
  },
  {
    id: "campanhas",
    icon: MessageCircle,
    title: "Campanhas via WhatsApp",
    description: "Disparo segmentado, mensagens personalizadas com nome e veículo, modelos prontos por objetivo.",
    mockup: null,
  },
  {
    id: "ia",
    icon: Bot,
    title: "Sócio IA",
    description: "Consultor disponível 24h que analisa seus dados, sugere ações e responde dúvidas sobre o negócio.",
    mockup: null,
  },
];

export const Features = () => {
  const [active, setActive] = useState(0);
  const feat = features[active];

  return (
    <section id="funcionalidades" className="py-24 lg:py-32" style={{ background: '#0A0A0A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-widest text-primary uppercase mb-4 block"
          >
            Funcionalidades
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl sm:text-4xl font-bold mb-4"
          >
            Tudo que você precisa para{" "}
            <span className="text-gradient-primary">crescer</span>
          </motion.h2>
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-8">
          {/* Tabs */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {features.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActive(i)}
                className={`flex items-center gap-3 px-5 py-4 rounded-xl text-left whitespace-nowrap lg:whitespace-normal transition-all duration-200 shrink-0 ${
                  active === i
                    ? "bg-primary/10 border border-primary/30 text-foreground"
                    : "border border-transparent hover:bg-[#111] text-muted-foreground"
                }`}
              >
                <f.icon className={`w-5 h-5 shrink-0 ${active === i ? "text-primary" : ""}`} />
                <span className="font-medium text-sm">{f.title}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-[#1a1a1a] p-8 lg:p-10"
            style={{ background: '#111111' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <feat.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl">{feat.title}</h3>
            </div>
            <p className="text-muted-foreground mb-8 max-w-lg">{feat.description}</p>

            {/* Mockup visual */}
            {feat.id === "agenda" && feat.mockup && (
              <div className="space-y-3">
                {feat.mockup.map((item: any) => (
                  <div key={item.time} className="flex items-center gap-4 rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-4">
                    <span className="font-mono text-sm text-primary font-semibold w-14">{item.time}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.client}</p>
                      <p className="text-xs text-muted-foreground">{item.service}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'confirmed' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
                      {item.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {feat.id === "clientes" && feat.mockup && (
              <div className="space-y-3">
                {feat.mockup.map((item: any) => (
                  <div key={item.name} className="flex items-center gap-4 rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-4">
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-sm font-bold text-foreground">
                      {item.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.vehicle} · Última visita {item.lastVisit}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === 'active' ? 'bg-primary/10 text-primary' :
                      item.status === 'risk' ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {item.status === 'active' ? 'Ativo' : item.status === 'risk' ? 'Em risco' : 'Inativo'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {feat.id === "estoque" && feat.mockup && (
              <div className="space-y-3">
                {feat.mockup.map((item: any) => (
                  <div key={item.product} className="flex items-center gap-4 rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.product}</p>
                      <p className="text-xs text-muted-foreground">Custo por uso: {item.costPerUse}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${item.stock <= item.min ? 'text-destructive' : 'text-foreground'}`}>
                        {item.stock} un.
                      </p>
                      <p className="text-xs text-muted-foreground">mín: {item.min}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!feat.mockup && (
              <div className="rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-8 flex items-center justify-center">
                <div className="text-center">
                  <feat.icon className="w-12 h-12 text-primary/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Visualização disponível dentro da plataforma</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
