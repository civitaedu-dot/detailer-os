import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Bot,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  {
    label: "Faturamento do Mês",
    value: "R$ 12.450",
    change: "+12%",
    trend: "up",
    icon: DollarSign,
  },
  {
    label: "Ticket Médio",
    value: "R$ 285",
    change: "+5%",
    trend: "up",
    icon: TrendingUp,
  },
  {
    label: "Atendimentos",
    value: "43",
    change: "-3%",
    trend: "down",
    icon: Calendar,
  },
  {
    label: "Lucro Estimado",
    value: "R$ 4.890",
    change: "+18%",
    trend: "up",
    icon: TrendingUp,
  },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-sm">D</span>
              </div>
              <span className="font-display font-semibold hidden sm:block">
                Detailer<span className="text-primary">OS</span>
              </span>
            </Link>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/financeiro">Financeiro</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/agenda">Agenda</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/clientes">Clientes</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            Bom dia! 👋
          </h1>
          <p className="text-muted-foreground">
            Aqui está o resumo do seu negócio este mês.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <span className={`inline-flex items-center text-sm font-medium ${
                  stat.trend === "up" ? "text-success" : "text-destructive"
                }`}>
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold font-display mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* AI Partner CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-primary rounded-2xl p-8 shadow-accent-glow"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <Bot className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-primary-foreground mb-2">
                Fale com seu Sócio IA
              </h2>
              <p className="text-primary-foreground/80 mb-4 sm:mb-0">
                Tire dúvidas, peça análises e receba sugestões personalizadas para melhorar seu negócio.
              </p>
            </div>
            <Button 
              size="lg" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shrink-0"
              asChild
            >
              <Link to="/socio-ia">
                Conversar agora
              </Link>
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;