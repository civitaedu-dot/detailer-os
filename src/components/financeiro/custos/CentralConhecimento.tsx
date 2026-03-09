import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Building2, TrendingUp, ChevronRight, ChevronDown,
  CheckCircle2, Circle, Zap, Users, Cpu, Package, Truck,
  Megaphone, Receipt, Wrench, Target, BarChart3, HelpCircle,
  ArrowRight, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CentralConhecimentoProps {
  onAddCost: (prefill?: { category?: string; type?: "fixed" | "variable"; name?: string }) => void;
}

const CHECKLIST_AREAS = [
  {
    area: "Espaço Físico",
    icon: Building2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    items: [
      { name: "Aluguel ou financiamento do espaço", type: "fixed" as const, category: "infraestrutura" },
      { name: "IPTU (imposto predial)", type: "fixed" as const, category: "impostos" },
      { name: "Condomínio ou taxa de condomínio", type: "fixed" as const, category: "infraestrutura" },
      { name: "Energia elétrica", type: "fixed" as const, category: "infraestrutura" },
      { name: "Água e saneamento", type: "fixed" as const, category: "infraestrutura" },
      { name: "Seguro do espaço", type: "fixed" as const, category: "infraestrutura" },
    ],
  },
  {
    area: "Pessoas",
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    items: [
      { name: "Salários de funcionários CLT", type: "fixed" as const, category: "pessoal" },
      { name: "FGTS (8% sobre salários)", type: "fixed" as const, category: "pessoal" },
      { name: "INSS patronal", type: "fixed" as const, category: "pessoal" },
      { name: "Vale transporte", type: "fixed" as const, category: "pessoal" },
      { name: "Vale refeição ou alimentação", type: "fixed" as const, category: "pessoal" },
      { name: "Comissão de funcionários/vendedores", type: "variable" as const, category: "pessoal" },
      { name: "Pró-labore (sua retirada como sócio)", type: "fixed" as const, category: "pessoal" },
    ],
  },
  {
    area: "Tecnologia",
    icon: Cpu,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    items: [
      { name: "Software de gestão / ERP", type: "fixed" as const, category: "tecnologia" },
      { name: "Plataforma de agendamento online", type: "fixed" as const, category: "tecnologia" },
      { name: "Internet e telefonia", type: "fixed" as const, category: "infraestrutura" },
      { name: "Hospedagem de site / servidor", type: "fixed" as const, category: "tecnologia" },
      { name: "Ferramentas de produtividade (Google, Office)", type: "fixed" as const, category: "tecnologia" },
      { name: "Antivírus e segurança digital", type: "fixed" as const, category: "tecnologia" },
    ],
  },
  {
    area: "Produção / Serviço",
    icon: Package,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    items: [
      { name: "Matéria-prima ou insumos", type: "variable" as const, category: "producao" },
      { name: "Produtos e materiais usados por serviço", type: "variable" as const, category: "producao" },
      { name: "Embalagens", type: "variable" as const, category: "producao" },
      { name: "Manutenção de equipamentos", type: "fixed" as const, category: "manutencao" },
      { name: "Uniforme e EPI da equipe", type: "fixed" as const, category: "pessoal" },
    ],
  },
  {
    area: "Vendas e Marketing",
    icon: Megaphone,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    items: [
      { name: "Publicidade no Google ou Meta Ads", type: "variable" as const, category: "marketing" },
      { name: "Taxa de marketplace ou app de entregas", type: "variable" as const, category: "marketing" },
      { name: "Taxa do cartão de crédito", type: "variable" as const, category: "servicos" },
      { name: "Taxa do cartão de débito", type: "variable" as const, category: "servicos" },
      { name: "Material gráfico e embalagens de marketing", type: "fixed" as const, category: "marketing" },
    ],
  },
  {
    area: "Burocracia e Impostos",
    icon: Receipt,
    color: "text-red-400",
    bg: "bg-red-500/10",
    items: [
      { name: "DAS – Simples Nacional", type: "variable" as const, category: "impostos" },
      { name: "Honorários de contador", type: "fixed" as const, category: "servicos" },
      { name: "ISS – Imposto sobre Serviços", type: "variable" as const, category: "impostos" },
      { name: "Taxas e alvarás de funcionamento", type: "fixed" as const, category: "impostos" },
      { name: "Certificado digital", type: "fixed" as const, category: "tecnologia" },
    ],
  },
  {
    area: "Financeiro e Empréstimos",
    icon: BarChart3,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    items: [
      { name: "Parcelas de empréstimo bancário", type: "fixed" as const, category: "outros" },
      { name: "Financiamento de equipamentos", type: "fixed" as const, category: "outros" },
      { name: "Tarifas bancárias", type: "fixed" as const, category: "outros" },
      { name: "IOF e encargos financeiros", type: "variable" as const, category: "outros" },
    ],
  },
];

const QUIZ_QUESTIONS = [
  { id: "espaco", text: "Você tem espaço físico alugado?", suggestions: ["Aluguel", "IPTU", "Energia elétrica", "Água"] },
  { id: "funcionarios", text: "Tem funcionários com registro em carteira?", suggestions: ["Salários CLT", "FGTS", "INSS patronal", "Vale transporte"] },
  { id: "delivery", text: "Usa aplicativos de entrega ou marketplace?", suggestions: ["Taxa de iFood/Rappi", "Taxa de marketplace", "Embalagens de delivery"] },
  { id: "veiculo", text: "Possui veículos para distribuição ou atendimento?", suggestions: ["Combustível", "Manutenção veicular", "Seguro do veículo", "IPVA"] },
  { id: "comissao", text: "Paga comissão para vendedores ou representantes?", suggestions: ["Comissão de vendas", "Comissão de parceiros", "Taxa de indicação"] },
];

const BENCHMARKS = [
  { segmento: "Serviços em geral", custoFixo: "25-40%", custoVar: "15-30%", margem: "30-60%" },
  { segmento: "Comércio varejista", custoFixo: "20-35%", custoVar: "40-60%", margem: "20-35%" },
  { segmento: "Indústria de pequeno porte", custoFixo: "30-50%", custoVar: "30-50%", margem: "15-30%" },
  { segmento: "E-commerce", custoFixo: "15-25%", custoVar: "45-65%", margem: "15-25%" },
];

export function CentralConhecimento({ onAddCost }: CentralConhecimentoProps) {
  const [activeSection, setActiveSection] = useState<"guide" | "quiz" | "benchmark">("guide");
  const [expandedArea, setExpandedArea] = useState<string | null>(CHECKLIST_AREAS[0].area);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<Record<string, boolean | null>>({});
  const [quizDone, setQuizDone] = useState(false);

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const answeredQuiz = Object.values(quizAnswers).filter(v => v !== null).length;
  const suggestedFromQuiz = QUIZ_QUESTIONS
    .filter(q => quizAnswers[q.id] === true)
    .flatMap(q => q.suggestions);

  const sections = [
    { id: "guide" as const, label: "Guia Interativo", icon: CheckCircle2 },
    { id: "quiz" as const, label: "Assistente", icon: Sparkles },
    { id: "benchmark" as const, label: "Benchmarks", icon: BarChart3 },
  ];

  return (
    <div className="space-y-5">
      {/* Educational Header */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">Central de Conhecimento Financeiro</h3>
            <p className="text-xs text-muted-foreground">Aprenda a identificar e classificar todos os seus custos</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
            <p className="font-semibold text-blue-400 flex items-center gap-1 mb-1"><Building2 className="w-3.5 h-3.5" /> Custo Fixo</p>
            <p className="text-xs text-muted-foreground">Existe todo mês, mesmo que você não venda nada. É a base da sua estrutura.</p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <p className="font-semibold text-amber-400 flex items-center gap-1 mb-1"><TrendingUp className="w-3.5 h-3.5" /> Custo Variável</p>
            <p className="text-xs text-muted-foreground">Cresce com as vendas. Quanto mais você vende, mais você paga.</p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 flex-wrap">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeSection === s.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* GUIDE: Interactive Checklist */}
        {activeSection === "guide" && (
          <motion.div key="guide" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Percorra cada área do seu negócio e marque os custos que você <strong>já tem cadastrados</strong>. Para os não cadastrados, use o botão de atalho.
            </p>
            {CHECKLIST_AREAS.map((area) => {
              const Icon = area.icon;
              const areaChecked = area.items.filter(item => checkedItems.has(`${area.area}-${item.name}`)).length;
              return (
                <div key={area.area} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedArea(expandedArea === area.area ? null : area.area)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", area.bg, area.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{area.area}</p>
                      <p className="text-xs text-muted-foreground">{areaChecked}/{area.items.length} verificados</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {areaChecked > 0 && (
                        <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(areaChecked / area.items.length) * 100}%` }} />
                        </div>
                      )}
                      {expandedArea === area.area ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedArea === area.area && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2 border-t border-border">
                          {area.items.map((item) => {
                            const key = `${area.area}-${item.name}`;
                            const isChecked = checkedItems.has(key);
                            return (
                              <div key={item.name} className="flex items-center gap-3 py-2">
                                <button onClick={() => toggleCheck(key)} className={cn("shrink-0 transition-colors", isChecked ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                                  {isChecked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-sm", isChecked && "line-through text-muted-foreground")}>{item.name}</p>
                                  <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", item.type === "fixed" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400")}>
                                    {item.type === "fixed" ? "Fixo" : "Variável"}
                                  </span>
                                </div>
                                {!isChecked && (
                                  <Button
                                    variant="ghost" size="sm"
                                    className="shrink-0 text-xs h-7 px-2"
                                    onClick={() => onAddCost({ category: item.category, type: item.type, name: item.name })}
                                  >
                                    <Plus className="w-3 h-3 mr-1" /> Cadastrar
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* QUIZ: Guided Assistant */}
        {activeSection === "quiz" && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-sm text-muted-foreground">Responda algumas perguntas e o assistente vai sugerir custos que você pode ainda não ter cadastrado.</p>
            {QUIZ_QUESTIONS.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <p className="text-sm font-medium mb-3">{q.text}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: true }))}
                    className={cn("px-4 py-1.5 rounded-lg text-sm font-medium border transition-all", quizAnswers[q.id] === true ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary")}
                  >Sim</button>
                  <button
                    onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: false }))}
                    className={cn("px-4 py-1.5 rounded-lg text-sm font-medium border transition-all", quizAnswers[q.id] === false ? "bg-secondary text-foreground border-border" : "border-border hover:bg-secondary")}
                  >Não</button>
                </div>
              </motion.div>
            ))}

            {answeredQuiz >= 3 && suggestedFromQuiz.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Custos que você provavelmente tem:</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedFromQuiz.map(suggestion => (
                    <div key={suggestion} className="flex items-center justify-between gap-2 p-2 bg-secondary/50 rounded-lg">
                      <p className="text-sm">{suggestion}</p>
                      <Button
                        variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0"
                        onClick={() => onAddCost({ name: suggestion })}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* BENCHMARKS */}
        {activeSection === "benchmark" && (
          <motion.div key="benchmark" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-sm text-muted-foreground">Compare sua estrutura de custos com a média de empresas do mesmo segmento.</p>
            {BENCHMARKS.map((b, i) => (
              <motion.div
                key={b.segmento}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <h4 className="font-semibold text-sm mb-3">{b.segmento}</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-500/5 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground mb-1">Custo Fixo/Faturamento</p>
                    <p className="font-bold text-blue-400 text-sm">{b.custoFixo}</p>
                  </div>
                  <div className="bg-amber-500/5 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground mb-1">Custo Variável/Faturamento</p>
                    <p className="font-bold text-amber-400 text-sm">{b.custoVar}</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground mb-1">Margem Líquida</p>
                    <p className="font-bold text-primary text-sm">{b.margem}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="p-4 bg-secondary/30 rounded-xl text-xs text-muted-foreground">
              * Benchmarks são médias de mercado e variam conforme localização, porte e modelo de negócio. Use como referência, não como meta absoluta.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
