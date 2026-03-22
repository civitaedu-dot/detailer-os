import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, UserPlus, UserCheck, UserX, TrendingUp, DollarSign, Target,
  AlertTriangle, Clock, Phone, MessageSquare, Download, ChevronRight,
  BarChart3, Calendar, Star, Lightbulb, ArrowUpRight, ArrowDownRight,
  Filter, Search, RefreshCw, Eye, Send
} from "lucide-react";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { BulkWhatsAppModal } from "@/components/whatsapp/BulkWhatsAppModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import logo from "@/assets/logo.jpeg";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, CreditCard, Loader2, Wrench, Upload, Bot, Shield } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { format, subMonths, differenceInDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// Retention tips database
const RETENTION_TIPS = {
  lostClients: [
    { author: "Dale Carnegie", tip: "Lembre o nome do cliente e algo pessoal sobre ele ao fazer contato. Pessoas se sentem valorizadas quando são lembradas." },
    { author: "Nicholas Boothman", tip: "Nos primeiros 90 segundos do contato, demonstre empatia genuína. Pergunte como ele está antes de falar sobre serviços." },
    { author: "48 Leis do Poder", tip: "Nunca pareça desesperado. Ofereça algo de valor (desconto, cortesia) como se fosse exclusivo, não como desespero." },
    { author: "Vendas", tip: "Faça follow-up por WhatsApp com uma foto do último serviço realizado. Mostre o resultado e pergunte como está o veículo." },
  ],
  growing: [
    { author: "Dale Carnegie", tip: "Elogie genuinamente seus clientes fiéis. Um agradecimento personalizado gera mais fidelidade que qualquer desconto." },
    { author: "Nicholas Boothman", tip: "Crie rituais de recepção: ofereça café, chame pelo nome, mostre interesse real no cliente." },
    { author: "48 Leis do Poder", tip: "Use a escassez a seu favor. Ofereça pacotes limitados para clientes que retornam dentro de 30 dias." },
    { author: "Vendas", tip: "Crie um programa de indicação simples: cliente que indica ganha um brinde ou desconto no próximo serviço." },
  ],
  general: [
    { author: "Dale Carnegie", tip: "Faça o cliente se sentir o mais importante da sua agenda. Atenção exclusiva durante o atendimento vale mais que preço baixo." },
    { author: "Nicholas Boothman", tip: "Sorria ao atender, use linguagem corporal aberta e mantenha contato visual. A primeira impressão define a relação." },
    { author: "48 Leis do Poder", tip: "Antecipe necessidades. Se sabe que o cliente viaja todo mês, sugira um pacote de manutenção preventiva." },
    { author: "Vendas", tip: "Envie uma mensagem 3 dias após o serviço perguntando se está satisfeito. Isso mostra cuidado sem ser invasivo." },
  ],
};

interface ClientHealth {
  id: string;
  name: string;
  phone: string;
  lastVisit: string | null;
  totalVisits: number;
  totalValue: number;
  avgFrequencyDays: number | null;
  daysSinceLastVisit: number | null;
  status: "active" | "at_risk" | "inactive" | "lost";
  reconquestNote?: string;
}

interface SalesGoals {
  newClientsGoal: number;
  revenueGoal: number;
  retentionGoal: number;
}

const Vendas = () => {
  const { user, profile, session, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { clients } = useClients();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("painel");
  const [searchTerm, setSearchTerm] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Sales goals state
  const [salesGoals, setSalesGoals] = useState<SalesGoals>({
    newClientsGoal: 10,
    revenueGoal: 15000,
    retentionGoal: 80,
  });
  const [editingGoals, setEditingGoals] = useState(false);

  // Reconquest notes
  const [reconquestNotes, setReconquestNotes] = useState<Record<string, string>>({});
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkClients, setBulkClients] = useState<{id:string;name:string;phone:string}[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  // Fetch all appointments (no date filter)
  const fetchAllAppointments = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      setAppointments(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAllAppointments(); }, [fetchAllAppointments]);

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  // --- KPI Calculations ---
  const clientHealthMap = useMemo(() => {
    const map: Record<string, ClientHealth> = {};
    clients.forEach((c) => {
      map[c.id] = {
        id: c.id,
        name: c.name,
        phone: c.phone,
        lastVisit: null,
        totalVisits: 0,
        totalValue: 0,
        avgFrequencyDays: null,
        daysSinceLastVisit: null,
        status: "inactive",
      };
    });

    // Process appointments per client
    const clientAppointments: Record<string, any[]> = {};
    appointments
      .filter((a) => a.status === "completed" && a.client_id)
      .forEach((a) => {
        if (!clientAppointments[a.client_id]) clientAppointments[a.client_id] = [];
        clientAppointments[a.client_id].push(a);
      });

    Object.entries(clientAppointments).forEach(([clientId, apts]) => {
      if (!map[clientId]) return;
      const sorted = apts.sort((a: any, b: any) => b.appointment_date.localeCompare(a.appointment_date));
      const lastDate = sorted[0]?.appointment_date;
      const daysSince = lastDate ? differenceInDays(now, parseISO(lastDate)) : null;

      let avgFreq: number | null = null;
      if (sorted.length >= 2) {
        const diffs = [];
        for (let i = 0; i < sorted.length - 1; i++) {
          diffs.push(differenceInDays(parseISO(sorted[i].appointment_date), parseISO(sorted[i + 1].appointment_date)));
        }
        avgFreq = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
      }

      let status: ClientHealth["status"] = "active";
      if (daysSince !== null) {
        if (daysSince > 45) status = "lost";
        else if (daysSince > 30) status = "inactive";
        else if (daysSince > 15) status = "at_risk";
      } else {
        status = "inactive";
      }

      map[clientId] = {
        ...map[clientId],
        lastVisit: lastDate,
        totalVisits: sorted.length,
        totalValue: sorted.reduce((sum: number, a: any) => sum + (a.service_value || 0), 0),
        avgFrequencyDays: avgFreq,
        daysSinceLastVisit: daysSince,
        status,
      };
    });

    // Mark clients without any completed appointments
    Object.keys(map).forEach((id) => {
      if (!clientAppointments[id]) {
        map[id].status = "inactive";
      }
    });

    return map;
  }, [clients, appointments, now]);

  const healthList = useMemo(() => Object.values(clientHealthMap), [clientHealthMap]);

  const kpis = useMemo(() => {
    const totalClients = clients.length;
    const thisMonthClients = clients.filter(
      (c) => parseISO(c.created_at) >= currentMonthStart && parseISO(c.created_at) <= currentMonthEnd
    ).length;
    const activeClients = healthList.filter((c) => c.status === "active").length;
    const atRiskClients = healthList.filter((c) => c.status === "at_risk").length;
    const lostClients = healthList.filter((c) => c.status === "lost").length;
    const retentionRate = totalClients > 0 ? ((activeClients + atRiskClients) / totalClients) * 100 : 0;
    const totalRevenue = healthList.reduce((s, c) => s + c.totalValue, 0);
    const avgTicket = totalClients > 0 ? totalRevenue / totalClients : 0;

    return { totalClients, thisMonthClients, activeClients, atRiskClients, lostClients, retentionRate, avgTicket };
  }, [clients, healthList, currentMonthStart, currentMonthEnd]);

  // --- Monthly evolution (last 6 months) ---
  const monthlyEvolution = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const ms = startOfMonth(monthDate);
      const me = endOfMonth(monthDate);
      const label = format(monthDate, "MMM/yy", { locale: ptBR });

      const newClients = clients.filter((c) => {
        const d = parseISO(c.created_at);
        return d >= ms && d <= me;
      }).length;

      const monthAppts = appointments.filter((a) => {
        const d = parseISO(a.appointment_date);
        return a.status === "completed" && d >= ms && d <= me;
      });

      const revenue = monthAppts.reduce((s: number, a: any) => s + (a.service_value || 0), 0);

      months.push({ label, newClients, revenue, appointments: monthAppts.length });
    }
    return months;
  }, [clients, appointments, now]);

  // --- Top services ---
  const topServices = useMemo(() => {
    const serviceMap: Record<string, { count: number; revenue: number }> = {};
    appointments.filter((a) => a.status === "completed").forEach((a) => {
      if (!serviceMap[a.service_name]) serviceMap[a.service_name] = { count: 0, revenue: 0 };
      serviceMap[a.service_name].count++;
      serviceMap[a.service_name].revenue += a.service_value || 0;
    });
    return Object.entries(serviceMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [appointments]);

  // --- Busiest days ---
  const busiestDays = useMemo(() => {
    const dayMap: Record<string, number> = {};
    appointments.filter((a) => a.status === "completed").forEach((a) => {
      const day = format(parseISO(a.appointment_date), "EEEE", { locale: ptBR });
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    return Object.entries(dayMap)
      .map(([day, count]) => ({ day: day.charAt(0).toUpperCase() + day.slice(1), count }))
      .sort((a, b) => b.count - a.count);
  }, [appointments]);

  // --- Lost clients list ---
  const lostClientsList = useMemo(() => {
    return healthList
      .filter((c) => c.daysSinceLastVisit !== null && c.daysSinceLastVisit > 15)
      .sort((a, b) => (b.daysSinceLastVisit || 0) - (a.daysSinceLastVisit || 0));
  }, [healthList]);

  // --- Contextual tips ---
  const contextualTips = useMemo(() => {
    if (kpis.lostClients > kpis.activeClients) return RETENTION_TIPS.lostClients;
    if (kpis.thisMonthClients > 3) return RETENTION_TIPS.growing;
    return RETENTION_TIPS.general;
  }, [kpis]);

  // --- Goals progress ---
  const goalsProgress = useMemo(() => ({
    newClients: salesGoals.newClientsGoal > 0 ? (kpis.thisMonthClients / salesGoals.newClientsGoal) * 100 : 0,
    revenue: salesGoals.revenueGoal > 0
      ? (monthlyEvolution[monthlyEvolution.length - 1]?.revenue || 0) / salesGoals.revenueGoal * 100
      : 0,
    retention: salesGoals.retentionGoal > 0 ? (kpis.retentionRate / salesGoals.retentionGoal) * 100 : 0,
  }), [kpis, salesGoals, monthlyEvolution]);

  const COLORS = ["hsl(152, 60%, 45%)", "hsl(142, 70%, 55%)", "hsl(38, 92%, 50%)", "hsl(200, 80%, 50%)", "hsl(0, 70%, 50%)"];

  const filteredHealthList = useMemo(() => {
    let list = healthList;
    if (healthFilter !== "all") list = list.filter((c) => c.status === healthFilter);
    if (searchTerm) list = list.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return list;
  }, [healthList, healthFilter, searchTerm]);

  const getStatusBadge = (status: ClientHealth["status"]) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativo</Badge>;
      case "at_risk": return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Em risco</Badge>;
      case "inactive": return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Inativo</Badge>;
      case "lost": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Perdido</Badge>;
    }
  };

  const getUrgencyBadge = (days: number | null) => {
    if (!days) return null;
    if (days > 45) return <Badge variant="destructive">+45 dias</Badge>;
    if (days > 30) return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">+30 dias</Badge>;
    if (days > 15) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">+15 dias</Badge>;
    return null;
  };

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((r) => Object.values(r).join(",")).join("\n");
    const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => { await signOut(); };
  const handleManageSubscription = async () => {
    if (!session?.access_token) return;
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch { toast({ title: "Erro", variant: "destructive" }); }
    finally { setIsOpeningPortal(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logo} alt="DetailerOS" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-display font-semibold hidden sm:block">Detailer<span className="text-primary">OS</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: "/dashboard", label: "Dashboard" },
              { to: "/financeiro", label: "Financeiro" },
              { to: "/agenda", label: "Agenda" },
              { to: "/clientes", label: "Clientes" },
              { to: "/servicos", label: "Serviços" },
              { to: "/orcamentos", label: "Orçamentos" },
            ].map((l) => (
              <Button key={l.to} variant="ghost" size="sm" asChild><Link to={l.to}>{l.label}</Link></Button>
            ))}
            <Button variant="default" size="sm" asChild><Link to="/vendas">Vendas</Link></Button>
            <Button variant="ghost" size="sm" asChild><Link to="/socio-ia"><Bot className="w-4 h-4 mr-1" />Sócio IA</Link></Button>
            {isAdmin && <Button variant="ghost" size="sm" asChild><Link to="/admin" className="text-primary"><Shield className="w-4 h-4 mr-1" />Admin</Link></Button>}
          </nav>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                    <span className="text-xs font-semibold text-primary">{profile?.name?.charAt(0).toUpperCase() || "U"}</span>
                  </div>
                  <span className="hidden sm:block">{profile?.name || "Usuário"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleManageSubscription} disabled={isOpeningPortal}>
                  {isOpeningPortal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Gerenciar assinatura
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive"><LogOut className="w-4 h-4 mr-2" />Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Mobile tabs */}
        <div className="md:hidden overflow-x-auto border-t border-border">
          <div className="flex items-center gap-1 px-4 py-2">
            {[
              { to: "/dashboard", label: "Dashboard" },
              { to: "/financeiro", label: "Financeiro" },
              { to: "/agenda", label: "Agenda" },
              { to: "/clientes", label: "Clientes" },
              { to: "/vendas", label: "Vendas", active: true },
            ].map((l) => (
              <Button key={l.to} variant={l.active ? "default" : "ghost"} size="sm" className="shrink-0" asChild>
                <Link to={l.to}>{l.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">Vendas</h1>
              <p className="text-muted-foreground text-sm">Performance comercial, carteira e retenção</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchAllAppointments()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
            </Button>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="painel" className="text-xs sm:text-sm">Painel</TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs sm:text-sm">Relatórios</TabsTrigger>
            <TabsTrigger value="carteira" className="text-xs sm:text-sm">Carteira</TabsTrigger>
            <TabsTrigger value="sumiram" className="text-xs sm:text-sm">Sumiram</TabsTrigger>
            <TabsTrigger value="retencao" className="text-xs sm:text-sm">Retenção</TabsTrigger>
            <TabsTrigger value="metas" className="text-xs sm:text-sm">Metas</TabsTrigger>
          </TabsList>

          {/* ========== PAINEL ========== */}
          <TabsContent value="painel" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: "Total Clientes", value: kpis.totalClients, icon: Users, color: "text-primary" },
                { label: "Novos no Mês", value: kpis.thisMonthClients, icon: UserPlus, color: "text-emerald-400" },
                { label: "Ativos", value: kpis.activeClients, icon: UserCheck, color: "text-green-400" },
                { label: "Perdidos", value: kpis.lostClients, icon: UserX, color: "text-red-400" },
                { label: "Taxa Retenção", value: `${kpis.retentionRate.toFixed(0)}%`, icon: TrendingUp, color: "text-blue-400" },
                { label: "Ticket Médio", value: formatCurrency(kpis.avgTicket), icon: DollarSign, color: "text-yellow-400" },
              ].map((kpi, i) => (
                <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                        <span className="text-xs text-muted-foreground">{kpi.label}</span>
                      </div>
                      <p className="text-lg sm:text-xl font-bold font-display">{kpi.value}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Evolution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evolução da Carteira — Últimos 6 Meses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyEvolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Line type="monotone" dataKey="newClients" name="Novos Clientes" stroke="hsl(152, 60%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="appointments" name="Atendimentos" stroke="hsl(142, 70%, 55%)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue evolution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Faturamento Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyEvolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                      />
                      <Bar dataKey="revenue" fill="hsl(152, 60%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== RELATÓRIOS ========== */}
          <TabsContent value="relatorios" className="space-y-6 mt-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <h2 className="font-display text-lg font-bold">Relatórios de Vendas</h2>
              <Button variant="outline" size="sm" onClick={() => exportCSV(
                topServices.map((s) => ({ servico: s.name, quantidade: s.count, faturamento: s.revenue })),
                "relatorio-servicos"
              )}>
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top services */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Serviços Mais Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {topServices.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={topServices} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, count }) => `${name} (${count})`}>
                            {topServices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">Nenhum serviço realizado ainda.</p>
                  )}
                </CardContent>
              </Card>

              {/* Busiest days */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dias com Mais Atendimentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {busiestDays.length > 0 ? (
                    <div className="space-y-3">
                      {busiestDays.map((d, i) => (
                        <div key={d.day} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}.</span>
                            <span className="font-medium">{d.day}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={(d.count / (busiestDays[0]?.count || 1)) * 100} className="w-24 h-2" />
                            <span className="text-sm font-bold w-8 text-right">{d.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado disponível.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Services ranking table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ranking de Serviços por Faturamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Serviço</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Qtd</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Faturamento</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Ticket Médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topServices.map((s, i) => (
                        <tr key={s.name} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-3 font-bold text-muted-foreground">{i + 1}</td>
                          <td className="py-2 px-3 font-medium">{s.name}</td>
                          <td className="py-2 px-3 text-right">{s.count}</td>
                          <td className="py-2 px-3 text-right font-medium text-primary">{formatCurrency(s.revenue)}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(s.count > 0 ? s.revenue / s.count : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== CARTEIRA ========== */}
          <TabsContent value="carteira" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="font-display text-lg font-bold">Carteira de Clientes</h2>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar cliente..." className="pl-9 w-48" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select value={healthFilter} onValueChange={setHealthFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="at_risk">Em risco</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                    <SelectItem value="lost">Perdidos</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => exportCSV(
                  filteredHealthList.map((c) => ({
                    nome: c.name, telefone: c.phone, status: c.status,
                    ultima_visita: c.lastVisit || "Nunca", total_visitas: c.totalVisits,
                    valor_total: c.totalValue, dias_ausente: c.daysSinceLastVisit ?? "N/A"
                  })),
                  "carteira-clientes"
                )}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {filteredHealthList.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum cliente encontrado.</CardContent></Card>
              ) : (
                filteredHealthList.map((client) => (
                  <Card key={client.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{client.name.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          {getStatusBadge(client.status)}
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">{client.totalVisits}</span> visitas
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(client.totalValue)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {client.lastVisit
                              ? `Última: ${format(parseISO(client.lastVisit), "dd/MM/yy")}`
                              : "Sem visitas"}
                          </div>
                          {client.avgFrequencyDays && (
                            <div className="text-xs text-muted-foreground">
                              Freq: {client.avgFrequencyDays}d
                            </div>
                          )}
                          <WhatsAppButton
                            clientName={client.name}
                            clientPhone={client.phone}
                            clientId={client.id}
                            daysSinceLastVisit={client.daysSinceLastVisit}
                            totalVisits={client.totalVisits}
                            context={client.status === 'lost' ? 'reconquista' : client.status === 'at_risk' ? 'reconquista' : 'geral'}
                            size="sm"
                          />
                          <Button variant="ghost" size="sm" asChild>
                            <Link to="/clientes"><Eye className="w-4 h-4" /></Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ========== CLIENTES QUE SUMIRAM ========== */}
          <TabsContent value="sumiram" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold">Clientes que Sumiram</h2>
                <p className="text-sm text-muted-foreground">{lostClientsList.length} cliente(s) sem retornar há mais de 15 dias</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => exportCSV(
                  lostClientsList.map((c) => ({ nome: c.name, telefone: c.phone, dias_ausente: c.daysSinceLastVisit, ultima_visita: c.lastVisit })),
                  "clientes-sumiram"
                )}>
                  <Download className="w-4 h-4 mr-1" /> Exportar
                </Button>
                {lostClientsList.length > 0 && (
                  <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                    setBulkClients(lostClientsList.map((c) => ({ id: c.id, name: c.name, phone: c.phone })));
                    setBulkModalOpen(true);
                  }}>
                    <Send className="w-4 h-4" /> Disparo em Lote
                  </Button>
                )}
              </div>
            </div>

            {lostClientsList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                  <p className="font-medium">Nenhum cliente ausente!</p>
                  <p className="text-sm text-muted-foreground">Todos os seus clientes estão ativos.</p>
                </CardContent>
              </Card>
            ) : (
              lostClientsList.map((client) => (
                <Card key={client.id} className={`border-l-4 ${
                  (client.daysSinceLastVisit || 0) > 45 ? "border-l-red-500" :
                  (client.daysSinceLastVisit || 0) > 30 ? "border-l-orange-500" : "border-l-yellow-500"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          </div>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {getUrgencyBadge(client.daysSinceLastVisit)}
                          <span className="text-xs text-muted-foreground">
                            Última visita: {client.lastVisit ? format(parseISO(client.lastVisit), "dd/MM/yyyy") : "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {client.totalVisits} visita(s) • {formatCurrency(client.totalValue)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Textarea
                          placeholder="Anotar resultado do contato de reconquista..."
                          className="text-sm flex-1 min-h-[60px]"
                          value={reconquestNotes[client.id] || ""}
                          onChange={(e) => setReconquestNotes((prev) => ({ ...prev, [client.id]: e.target.value }))}
                        />
                        <div className="flex sm:flex-col gap-2">
                          <WhatsAppButton
                            clientName={client.name}
                            clientPhone={client.phone}
                            clientId={client.id}
                            context="reconquista"
                            daysSinceLastVisit={client.daysSinceLastVisit}
                            totalVisits={client.totalVisits}
                            size="sm"
                          />
                          <Button size="sm" variant="default" className="flex-1" onClick={() => {
                            toast({ title: "Nota salva", description: `Anotação registrada para ${client.name}` });
                          }}>
                            <MessageSquare className="w-4 h-4 mr-1" /> Salvar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ========== RETENÇÃO ========== */}
          <TabsContent value="retencao" className="space-y-6 mt-4">
            <div>
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" /> Dicas de Retenção
              </h2>
              <p className="text-sm text-muted-foreground">
                {kpis.lostClients > kpis.activeClients
                  ? "Foco em reconquista — muitos clientes inativos detectados"
                  : kpis.thisMonthClients > 3
                    ? "Carteira crescendo — consolide esses relacionamentos"
                    : "Dicas gerais para fidelização e crescimento"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contextualTips.map((tip, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="h-full border-primary/10 hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Star className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-sm leading-relaxed mb-2">{tip.tip}</p>
                          <p className="text-xs text-muted-foreground font-medium">— Inspirado em {tip.author}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Retention summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo de Retenção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-emerald-500/10">
                    <p className="text-2xl font-bold text-emerald-400">{kpis.activeClients}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ativos</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                    <p className="text-2xl font-bold text-yellow-400">{kpis.atRiskClients}</p>
                    <p className="text-xs text-muted-foreground mt-1">Em Risco</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-500/10">
                    <p className="text-2xl font-bold text-red-400">{kpis.lostClients}</p>
                    <p className="text-xs text-muted-foreground mt-1">Perdidos</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-500/10">
                    <p className="text-2xl font-bold text-blue-400">{kpis.retentionRate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Taxa Retenção</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== METAS ========== */}
          <TabsContent value="metas" className="space-y-6 mt-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="font-display text-lg font-bold">Metas de Vendas</h2>
              <Button variant="outline" size="sm" onClick={() => setEditingGoals(!editingGoals)}>
                {editingGoals ? "Salvar" : "Editar Metas"}
              </Button>
            </div>

            {editingGoals && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Meta de Novos Clientes</label>
                      <Input
                        type="number"
                        value={salesGoals.newClientsGoal}
                        onChange={(e) => setSalesGoals((p) => ({ ...p, newClientsGoal: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Meta de Faturamento (R$)</label>
                      <Input
                        type="number"
                        value={salesGoals.revenueGoal}
                        onChange={(e) => setSalesGoals((p) => ({ ...p, revenueGoal: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Meta de Retenção (%)</label>
                      <Input
                        type="number"
                        value={salesGoals.retentionGoal}
                        onChange={(e) => setSalesGoals((p) => ({ ...p, retentionGoal: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* New clients goal */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-emerald-400" />
                      <span className="font-medium text-sm">Novos Clientes</span>
                    </div>
                    <span className="text-sm font-bold">
                      {kpis.thisMonthClients}/{salesGoals.newClientsGoal}
                    </span>
                  </div>
                  <Progress value={Math.min(goalsProgress.newClients, 100)} className="h-3 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {goalsProgress.newClients >= 100
                      ? "🎉 Meta atingida!"
                      : `Faltam ${salesGoals.newClientsGoal - kpis.thisMonthClients} clientes`}
                  </p>
                </CardContent>
              </Card>

              {/* Revenue goal */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-yellow-400" />
                      <span className="font-medium text-sm">Faturamento</span>
                    </div>
                    <span className="text-sm font-bold">
                      {formatCurrency(monthlyEvolution[monthlyEvolution.length - 1]?.revenue || 0)}
                    </span>
                  </div>
                  <Progress value={Math.min(goalsProgress.revenue, 100)} className="h-3 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Meta: {formatCurrency(salesGoals.revenueGoal)}
                    {goalsProgress.revenue >= 100 ? " — 🎉 Atingida!" : ""}
                  </p>
                </CardContent>
              </Card>

              {/* Retention goal */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      <span className="font-medium text-sm">Taxa de Retenção</span>
                    </div>
                    <span className="text-sm font-bold">{kpis.retentionRate.toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(goalsProgress.retention, 100)} className="h-3 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Meta: {salesGoals.retentionGoal}%
                    {goalsProgress.retention >= 100 ? " — 🎉 Atingida!" : ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comparativo Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Mês</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Novos Clientes</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Atendimentos</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyEvolution.map((m) => (
                        <tr key={m.label} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium capitalize">{m.label}</td>
                          <td className="py-2 px-3 text-right">{m.newClients}</td>
                          <td className="py-2 px-3 text-right">{m.appointments}</td>
                          <td className="py-2 px-3 text-right font-medium text-primary">{formatCurrency(m.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BulkWhatsAppModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        clients={bulkClients}
        category="reconquista"
      />
    </div>
  );
};

export default Vendas;
