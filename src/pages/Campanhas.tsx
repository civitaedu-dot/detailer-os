import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Megaphone, Plus, Send, Calendar, Users, Filter, Search, Eye, Trash2,
  ChevronRight, Gift, Zap, Star, UserPlus, Tag, Clock, Check, Target,
  Bot, Shield, LogOut, CreditCard, Loader2, Wrench, Upload, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useClients } from "@/hooks/useClients";
import { useAppointments } from "@/hooks/useAppointments";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUserRole } from "@/hooks/useUserRole";
import logo from "@/assets/logo.jpeg";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const CAMPAIGN_TEMPLATES = [
  {
    objective: "reativacao",
    name: "Reativação de Inativos",
    icon: Zap,
    color: "text-orange-400",
    message: "Olá {nome}! 👋 Faz um tempo que não nos vemos. Sentimos sua falta! Que tal agendar um {servico} para deixar seu {veiculo} impecável? Temos condições especiais para clientes como você. 🚗✨"
  },
  {
    objective: "promocao",
    name: "Promoção Sazonal",
    icon: Tag,
    color: "text-emerald-400",
    message: "Olá {nome}! 🎉 Temos uma promoção exclusiva neste mês! Aproveite condições especiais em nossos serviços. Agende agora e garanta o melhor para seu {veiculo}! 💎"
  },
  {
    objective: "aniversario",
    name: "Parabenização de Aniversário",
    icon: Gift,
    color: "text-pink-400",
    message: "Feliz aniversário, {nome}! 🎂🎉 Nesta data tão especial, queremos presentear você com um desconto exclusivo no próximo serviço. Você merece! 🎁"
  },
  {
    objective: "novo_servico",
    name: "Lançamento de Serviço",
    icon: Star,
    color: "text-blue-400",
    message: "Olá {nome}! 🚀 Temos novidades! Acabamos de lançar um novo serviço exclusivo que vai transformar seu {veiculo}. Quer saber mais? Entre em contato e agende uma demonstração! ✨"
  },
  {
    objective: "indicacao",
    name: "Campanha de Indicação",
    icon: UserPlus,
    color: "text-purple-400",
    message: "Olá {nome}! 🤝 Sabia que você pode ganhar benefícios indicando amigos? A cada indicação que agendar, você ganha um desconto especial no próximo atendimento. Indique agora! 🎯"
  },
];

const replaceVars = (msg: string, client: any, lastAppt: any) => {
  return msg
    .replace(/{nome}/g, client.name || "")
    .replace(/{veiculo}/g, client.vehicle || "seu veículo")
    .replace(/{servico}/g, lastAppt?.service_name || "nosso serviço")
    .replace(/{data_ultima_visita}/g, lastAppt?.appointment_date ? format(parseISO(lastAppt.appointment_date), "dd/MM/yyyy") : "");
};

const Campanhas = () => {
  const { user, profile, session, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { clients } = useClients();
  const { toast } = useToast();
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign, saveCampaignRecipients } = useCampaigns();

  const [activeTab, setActiveTab] = useState("criar");
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);

  // New campaign state
  const [campaignName, setCampaignName] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("geral");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Filters
  const [filterInactiveDays, setFilterInactiveDays] = useState<string>("all");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterBirthMonth, setFilterBirthMonth] = useState<string>("all");
  const [filterMinVisits, setFilterMinVisits] = useState<string>("");

  // Preview/send
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Calendar view
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Fetch appointments
  useState(() => {
    if (!user) return;
    supabase.from("appointments").select("*").eq("user_id", user.id)
      .then(({ data }) => setAppointments(data || []));
  });

  // Build client map with last appointment
  const clientMap = useMemo(() => {
    const map = new Map<string, { client: any; lastAppt: any; totalVisits: number; daysSince: number | null }>();
    clients.forEach((c) => {
      const appts = appointments.filter((a) => a.client_id === c.id && a.status === "completed")
        .sort((a: any, b: any) => b.appointment_date.localeCompare(a.appointment_date));
      const lastAppt = appts[0] || null;
      const daysSince = lastAppt ? differenceInDays(new Date(), parseISO(lastAppt.appointment_date)) : null;
      map.set(c.id, { client: c, lastAppt, totalVisits: appts.length, daysSince });
    });
    return map;
  }, [clients, appointments]);

  // Get unique services & vehicles
  const uniqueServices = useMemo(() => {
    const s = new Set<string>();
    appointments.forEach((a) => s.add(a.service_name));
    return Array.from(s).filter(Boolean).sort();
  }, [appointments]);

  const uniqueVehicles = useMemo(() => {
    const v = new Set<string>();
    clients.forEach((c) => { if (c.vehicle) v.add(c.vehicle); });
    return Array.from(v).sort();
  }, [clients]);

  // Apply filters to get target audience
  const targetClients = useMemo(() => {
    let list = Array.from(clientMap.values());

    if (filterInactiveDays !== "all") {
      const days = parseInt(filterInactiveDays);
      if (days === 0) {
        list = list.filter((c) => c.daysSince !== null && c.daysSince <= 15);
      } else {
        list = list.filter((c) => c.daysSince !== null && c.daysSince >= days);
      }
    }

    if (filterVehicle) {
      list = list.filter((c) => c.client.vehicle?.toLowerCase().includes(filterVehicle.toLowerCase()));
    }

    if (filterService) {
      const clientIdsWithService = new Set(
        appointments.filter((a) => a.service_name === filterService).map((a) => a.client_id)
      );
      list = list.filter((c) => clientIdsWithService.has(c.client.id));
    }

    if (filterBirthMonth !== "all") {
      const m = parseInt(filterBirthMonth);
      list = list.filter((c) => {
        if (!c.client.birthdate) return false;
        return parseISO(c.client.birthdate).getMonth() === m;
      });
    }

    if (filterMinVisits) {
      const min = parseInt(filterMinVisits);
      list = list.filter((c) => c.totalVisits >= min);
    }

    return list;
  }, [clientMap, filterInactiveDays, filterVehicle, filterService, filterBirthMonth, filterMinVisits, appointments]);

  const applyTemplate = (template: typeof CAMPAIGN_TEMPLATES[0]) => {
    setCampaignObjective(template.objective);
    setCampaignMessage(template.message);
    if (!campaignName) setCampaignName(template.name);
  };

  const handleSendCampaign = async () => {
    if (!user || !campaignName || !campaignMessage || targetClients.length === 0) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const campaign = await createCampaign({
        name: campaignName,
        objective: campaignObjective,
        message_template: campaignMessage,
        filters: { filterInactiveDays, filterVehicle, filterService, filterBirthMonth, filterMinVisits },
        target_count: targetClients.length,
        status: scheduledDate ? "scheduled" : "sent",
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
      });

      if (!campaign) return;

      // Open WhatsApp for each client
      const recipients: any[] = [];
      for (const item of targetClients) {
        const msg = replaceVars(campaignMessage, item.client, item.lastAppt);
        const phone = item.client.phone.replace(/\D/g, "");
        const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;

        if (!scheduledDate) {
          window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, "_blank");
        }

        recipients.push({
          client_id: item.client.id,
          client_name: item.client.name,
          client_phone: item.client.phone,
          message_sent: msg,
        });
      }

      await saveCampaignRecipients(campaign.id, recipients);
      await updateCampaign(campaign.id, { sent_count: recipients.length, sent_at: scheduledDate ? null : new Date().toISOString() } as any);

      toast({ title: scheduledDate ? "Campanha agendada!" : `Campanha enviada para ${recipients.length} clientes!` });

      // Reset
      setCampaignName("");
      setCampaignMessage("");
      setCampaignObjective("geral");
      setScheduledDate("");
      setScheduledTime("");
      setShowPreview(false);
      setActiveTab("historico");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // Calendar campaigns
  const calendarCampaigns = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return campaigns.filter((c) => {
      if (!c.scheduled_date && !c.sent_at) return false;
      const d = c.scheduled_date ? parseISO(c.scheduled_date) : parseISO(c.sent_at!);
      return d >= start && d <= end;
    });
  }, [campaigns, calendarMonth]);

  const getDaysInMonth = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent": return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Enviada</Badge>;
      case "scheduled": return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Agendada</Badge>;
      case "draft": return <Badge className="bg-muted text-muted-foreground">Rascunho</Badge>;
      default: return <Badge>{status}</Badge>;
    }
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
              { to: "/vendas", label: "Vendas" },
            ].map((l) => (
              <Button key={l.to} variant="ghost" size="sm" asChild><Link to={l.to}>{l.label}</Link></Button>
            ))}
            <Button variant="default" size="sm" asChild><Link to="/campanhas"><Megaphone className="w-4 h-4 mr-1" />Campanhas</Link></Button>
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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-primary" />
            Campanhas & Marketing
          </h1>
          <p className="text-muted-foreground mt-1">Crie campanhas segmentadas e comunique-se com sua base de clientes</p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Megaphone className="w-4 h-4" />
                <span className="text-xs">Total de Campanhas</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{campaigns.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Send className="w-4 h-4" />
                <span className="text-xs">Enviadas</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{campaigns.filter((c) => c.status === "sent").length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Agendadas</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{campaigns.filter((c) => c.status === "scheduled").length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Clientes Impactados</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{campaigns.reduce((a, c) => a + c.sent_count, 0)}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="criar" className="text-xs sm:text-sm">Criar</TabsTrigger>
            <TabsTrigger value="modelos" className="text-xs sm:text-sm">Modelos</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs sm:text-sm">Histórico</TabsTrigger>
            <TabsTrigger value="calendario" className="text-xs sm:text-sm">Calendário</TabsTrigger>
          </TabsList>

          {/* ===== CRIAR CAMPANHA ===== */}
          <TabsContent value="criar">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Campaign form */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Nova Campanha</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Nome da Campanha</Label>
                        <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex: Reativação de Março" />
                      </div>
                      <div>
                        <Label>Objetivo</Label>
                        <Select value={campaignObjective} onValueChange={setCampaignObjective}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="geral">Geral</SelectItem>
                            <SelectItem value="reativacao">Reativação</SelectItem>
                            <SelectItem value="promocao">Promoção</SelectItem>
                            <SelectItem value="aniversario">Aniversário</SelectItem>
                            <SelectItem value="novo_servico">Novo Serviço</SelectItem>
                            <SelectItem value="indicacao">Indicação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Mensagem</Label>
                      <Textarea
                        value={campaignMessage}
                        onChange={(e) => setCampaignMessage(e.target.value)}
                        placeholder="Use variáveis: {nome}, {veiculo}, {servico}, {data_ultima_visita}"
                        rows={5}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Variáveis: {"{nome}"}, {"{veiculo}"}, {"{servico}"}, {"{data_ultima_visita}"}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Agendar data (opcional)</Label>
                        <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Horário (opcional)</Label>
                        <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Segmentação do Público
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label>Tempo sem atendimento</Label>
                        <Select value={filterInactiveDays} onValueChange={setFilterInactiveDays}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="0">Ativos (até 15 dias)</SelectItem>
                            <SelectItem value="15">+15 dias sem visita</SelectItem>
                            <SelectItem value="30">+30 dias sem visita</SelectItem>
                            <SelectItem value="45">+45 dias sem visita</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Veículo</Label>
                        <Select value={filterVehicle || "all"} onValueChange={(v) => setFilterVehicle(v === "all" ? "" : v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {uniqueVehicles.map((v) => (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Serviço realizado</Label>
                        <Select value={filterService || "all"} onValueChange={(v) => setFilterService(v === "all" ? "" : v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {uniqueServices.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Aniversariantes do mês</Label>
                        <Select value={filterBirthMonth} onValueChange={setFilterBirthMonth}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {format(new Date(2024, i, 1), "MMMM", { locale: ptBR })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Mínimo de visitas</Label>
                        <Input type="number" min="0" value={filterMinVisits} onChange={(e) => setFilterMinVisits(e.target.value)} placeholder="Ex: 3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Audience preview */}
              <div className="space-y-4">
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Público-alvo
                    </CardTitle>
                    <CardDescription>{targetClients.length} cliente{targetClients.length !== 1 ? "s" : ""} selecionado{targetClients.length !== 1 ? "s" : ""}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {targetClients.slice(0, 20).map((item) => (
                        <div key={item.client.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                          <div>
                            <p className="font-medium">{item.client.name}</p>
                            <p className="text-xs text-muted-foreground">{item.client.vehicle || "—"}</p>
                          </div>
                          {item.daysSince !== null && (
                            <span className="text-xs text-muted-foreground">{item.daysSince}d</span>
                          )}
                        </div>
                      ))}
                      {targetClients.length > 20 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">+{targetClients.length - 20} clientes</p>
                      )}
                      {targetClients.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente corresponde aos filtros</p>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled={targetClients.length === 0 || !campaignMessage}
                        onClick={() => setShowPreview(true)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Pré-visualizar
                      </Button>
                      <Button
                        className="w-full"
                        disabled={targetClients.length === 0 || !campaignName || !campaignMessage || isSending}
                        onClick={handleSendCampaign}
                      >
                        {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        {scheduledDate ? "Agendar Campanha" : `Enviar para ${targetClients.length} clientes`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview Dialog */}
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Prévia da Mensagem</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      {targetClients.slice(0, 3).map((item) => (
                        <div key={item.client.id} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-xs font-medium text-emerald-400 mb-1">Para: {item.client.name}</p>
                          <p className="text-sm">{replaceVars(campaignMessage, item.client, item.lastAppt)}</p>
                        </div>
                      ))}
                      {targetClients.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">+{targetClients.length - 3} mensagens similares</p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </TabsContent>

          {/* ===== MODELOS ===== */}
          <TabsContent value="modelos">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CAMPAIGN_TEMPLATES.map((t) => (
                <Card key={t.objective} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { applyTemplate(t); setActiveTab("criar"); }}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <t.icon className={`w-5 h-5 ${t.color}`} />
                      {t.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-4">{t.message}</p>
                    <Button variant="ghost" size="sm" className="mt-3 w-full">
                      Usar modelo <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ===== HISTÓRICO ===== */}
          <TabsContent value="historico">
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Nenhuma campanha realizada ainda</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab("criar")}>
                      <Plus className="w-4 h-4 mr-2" />Criar primeira campanha
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                campaigns.map((c) => (
                  <Card key={c.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{c.name}</h3>
                            {getStatusBadge(c.status)}
                            <Badge variant="outline" className="text-xs">{c.objective}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.message_template}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.target_count} alvo</span>
                            <span className="flex items-center gap-1"><Send className="w-3 h-3" />{c.sent_count} enviados</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {c.sent_at ? format(parseISO(c.sent_at), "dd/MM/yyyy HH:mm") :
                               c.scheduled_date ? format(parseISO(c.scheduled_date), "dd/MM/yyyy") :
                               format(parseISO(c.created_at), "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteCampaign(c.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ===== CALENDÁRIO ===== */}
          <TabsContent value="calendario">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Calendário de Campanhas</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>←</Button>
                    <span className="text-sm font-medium min-w-[120px] text-center">
                      {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>→</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                  ))}
                  {/* Blank days for offset */}
                  {Array.from({ length: startOfMonth(calendarMonth).getDay() }, (_, i) => (
                    <div key={`blank-${i}`} />
                  ))}
                  {getDaysInMonth(calendarMonth).map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const dayCampaigns = calendarCampaigns.filter((c) => {
                      const d = c.scheduled_date || (c.sent_at ? c.sent_at.slice(0, 10) : null);
                      return d === dayStr;
                    });
                    const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;

                    return (
                      <div
                        key={dayStr}
                        className={`min-h-[60px] sm:min-h-[80px] p-1 rounded-lg border text-xs ${
                          isToday ? "border-primary/50 bg-primary/5" : "border-border/30"
                        }`}
                      >
                        <span className={`text-xs ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {day.getDate()}
                        </span>
                        {dayCampaigns.map((c) => (
                          <div key={c.id} className="mt-1 px-1 py-0.5 rounded bg-primary/20 text-primary text-[10px] truncate">
                            {c.name}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Campanhas;
