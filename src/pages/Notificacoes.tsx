import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, Filter, ExternalLink, Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, subDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const typeColors: Record<string, string> = {
  danger: "bg-destructive/10 border-destructive/30 text-destructive",
  warning: "bg-orange-500/10 border-orange-500/30 text-orange-600",
  alert: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600",
  success: "bg-green-500/10 border-green-500/30 text-green-600",
  info: "bg-primary/10 border-primary/30 text-primary",
  celebration: "bg-pink-500/10 border-pink-500/30 text-pink-600",
};

const categoryLabels: Record<string, string> = {
  retention: "Retenção",
  birthday: "Aniversário",
  milestone: "Marco",
  system: "Sistema",
};

interface NotificationSettings {
  retention_15_days: boolean;
  retention_30_days: boolean;
  retention_45_days: boolean;
  birthdays: boolean;
  first_visit: boolean;
  loyalty_milestones: boolean;
  appointment_status: boolean;
  no_future_booking: boolean;
}

const defaultSettings: NotificationSettings = {
  retention_15_days: true,
  retention_30_days: true,
  retention_45_days: true,
  birthdays: true,
  first_visit: true,
  loyalty_milestones: true,
  appointment_status: true,
  no_future_booking: true,
};

const Notificacoes = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const { user } = useAuth();
  const { toast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setSettings({
          retention_15_days: (data as any).retention_15_days,
          retention_30_days: (data as any).retention_30_days,
          retention_45_days: (data as any).retention_45_days,
          birthdays: (data as any).birthdays,
          first_visit: (data as any).first_visit,
          loyalty_milestones: (data as any).loyalty_milestones,
          appointment_status: (data as any).appointment_status,
          no_future_booking: (data as any).no_future_booking,
        });
      }
      setLoadingSettings(false);
    };
    load();
  }, [user]);

  const saveSettings = async (newSettings: NotificationSettings) => {
    if (!user) return;
    setSettings(newSettings);

    const { error } = await supabase
      .from("notification_settings")
      .upsert({ user_id: user.id, ...newSettings } as any, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas!" });
    }
  };

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (categoryFilter !== "all") {
      filtered = filtered.filter((n) => n.category === categoryFilter);
    }
    if (statusFilter === "unread") {
      filtered = filtered.filter((n) => !n.is_read);
    } else if (statusFilter === "read") {
      filtered = filtered.filter((n) => n.is_read);
    }
    if (periodFilter !== "all") {
      const days = parseInt(periodFilter);
      const cutoff = subDays(new Date(), days);
      filtered = filtered.filter((n) => isAfter(new Date(n.created_at), cutoff));
    }

    return filtered;
  }, [notifications, categoryFilter, statusFilter, periodFilter]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    for (const n of filteredNotifications) {
      const dateKey = format(new Date(n.created_at), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(n);
    }
    return groups;
  }, [filteredNotifications]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container px-4 sm:px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h1 className="font-display font-semibold text-lg">Central de Notificações</h1>
          </div>
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount} não lida{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-6">
        <Tabs defaultValue="notifications">
          <TabsList className="mb-6 w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="notifications" className="flex-1 sm:flex-none">
              <Bell className="w-4 h-4 mr-1" /> Notificações
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 sm:flex-none">
              <Settings className="w-4 h-4 mr-1" /> Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="retention">Retenção</SelectItem>
                  <SelectItem value="birthday">Aniversário</SelectItem>
                  <SelectItem value="milestone">Marco</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="unread">Não lidas</SelectItem>
                  <SelectItem value="read">Lidas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="1">Hoje</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2 ml-auto">
                {unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllAsRead}>
                    <CheckCheck className="w-4 h-4 mr-1" /> Ler todas
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={clearAll}>
                    <Trash2 className="w-4 h-4 mr-1" /> Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedByDate).map(([dateKey, notifs]) => (
                  <div key={dateKey}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                      {format(new Date(dateKey), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <Card>
                      <CardContent className="p-0 divide-y divide-border">
                        {notifs.map((n) => {
                          const colorClass = typeColors[n.type] || typeColors.info;
                          return (
                            <motion.div
                              key={n.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={cn("p-4 flex items-start gap-3 transition-colors", !n.is_read && "bg-accent/20")}
                            >
                              <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", !n.is_read ? "bg-primary" : "bg-transparent")} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", colorClass)}>
                                    {categoryLabels[n.category] || n.category}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                                  </span>
                                </div>
                                <p className="text-sm font-medium">{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                                {n.client_id && (
                                  <Link to="/clientes" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                                    <ExternalLink className="w-3 h-3" /> Ver perfil do cliente
                                  </Link>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {!n.is_read && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markAsRead(n.id)}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteNotification(n.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurar Alertas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase">Retenção de Clientes</h3>
                  <div className="space-y-3">
                    {[
                      { key: "retention_15_days" as const, label: "Alerta de 15 dias sem retorno", desc: "Cliente em risco de inatividade" },
                      { key: "retention_30_days" as const, label: "Alerta de 30 dias sem retorno", desc: "Cliente inativo" },
                      { key: "retention_45_days" as const, label: "Alerta de 45+ dias sem retorno", desc: "Cliente perdido — ação urgente" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <Label className="font-medium">{item.label}</Label>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch
                          checked={settings[item.key]}
                          onCheckedChange={(v) => saveSettings({ ...settings, [item.key]: v })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase">Eventos de Clientes</h3>
                  <div className="space-y-3">
                    {[
                      { key: "birthdays" as const, label: "Aniversários", desc: "Notificar 1 dia antes e no dia" },
                      { key: "first_visit" as const, label: "Primeira visita", desc: "Quando um cliente completa a primeira visita" },
                      { key: "loyalty_milestones" as const, label: "Marcos de fidelidade", desc: "5, 10 e 20 atendimentos" },
                      { key: "no_future_booking" as const, label: "Sem agendamento futuro", desc: "Cliente com 3+ visitas sem agendamento" },
                      { key: "appointment_status" as const, label: "Status de agendamentos", desc: "Confirmações e cancelamentos" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <Label className="font-medium">{item.label}</Label>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch
                          checked={settings[item.key]}
                          onCheckedChange={(v) => saveSettings({ ...settings, [item.key]: v })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Notificacoes;
