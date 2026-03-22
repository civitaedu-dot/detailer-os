import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />
      {/* Green glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary tracking-wide uppercase">
                Gestão + IA para estéticas automotivas
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
            >
              Chega de perder cliente por falta de{" "}
              <span className="text-gradient-primary">controle.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed"
            >
              A plataforma completa que organiza agenda, clientes, estoque e financeiro da sua estética automotiva — com um sócio de IA disponível 24h.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base h-14 px-8 rounded-xl">
                <Link to="/cadastro">
                  Começar agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#333] text-foreground hover:bg-[#111] font-medium text-base h-14 px-8 rounded-xl">
                <a href="#funcionalidades">
                  <Play className="w-4 h-4 mr-2" />
                  Ver como funciona
                </a>
              </Button>
            </motion.div>
          </div>

          {/* Right — Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            {/* Desktop frame */}
            <div className="relative rounded-2xl border border-[#222] bg-[#111] p-1 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#222]">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">detaileros.app/dashboard</span>
              </div>
              <div className="aspect-[16/10] bg-[#0A0A0A] rounded-b-xl overflow-hidden flex items-center justify-center">
                <div className="w-full h-full p-6 space-y-4">
                  {/* Fake KPI row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Faturamento", value: "R$ 18.450", color: "bg-primary/20 text-primary" },
                      { label: "Clientes ativos", value: "127", color: "bg-blue-500/20 text-blue-400" },
                      { label: "Retenção", value: "89%", color: "bg-amber-500/20 text-amber-400" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="rounded-xl border border-[#222] bg-[#111] p-4">
                        <p className="text-[10px] text-muted-foreground mb-1">{kpi.label}</p>
                        <p className={`font-display font-bold text-lg ${kpi.color.split(' ')[1]}`}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Fake chart */}
                  <div className="rounded-xl border border-[#222] bg-[#111] p-4 flex-1">
                    <p className="text-[10px] text-muted-foreground mb-3">Faturamento mensal</p>
                    <div className="flex items-end gap-2 h-24">
                      {[40, 55, 35, 65, 50, 80].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-primary/60" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile frame overlay */}
            <div className="absolute -bottom-6 -right-6 w-[140px] rounded-2xl border border-[#222] bg-[#111] p-1 shadow-2xl shadow-black/60">
              <div className="rounded-xl bg-[#0A0A0A] p-3 space-y-2">
                <div className="h-2 w-12 rounded bg-primary/30" />
                <div className="h-2 w-16 rounded bg-[#222]" />
                <div className="h-8 rounded bg-primary/20" />
                <div className="h-2 w-10 rounded bg-[#222]" />
                <div className="h-6 rounded bg-[#222]" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
    </section>
  );
};
