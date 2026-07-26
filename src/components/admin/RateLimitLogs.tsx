import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, ShieldAlert, Ban, Activity, Clock } from "lucide-react";

interface RateLimitLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  endpoint: string;
  rule_key: string;
  request_count: number;
  max_requests: number;
  window_seconds: number;
  blocked_seconds: number;
  strikes: number;
  created_at: string;
}

interface ActiveBlock {
  id: string;
  identity_key: string;
  rule_key: string;
  strikes: number;
  blocked_until: string | null;
}

const RULE_LABELS: Record<string, string> = {
  auth_login: "Login (e-mail)",
  auth_login_ip: "Login (IP)",
  auth_signup: "Cadastro",
  auth_password_reset: "Recuperação de senha",
  auth_password_update: "Redefinição de senha",
  ai_chat: "Sócio IA (por minuto)",
  ai_chat_burst: "Sócio IA (por hora)",
  import_file: "Importação de arquivos",
  report_generation: "Geração de relatórios",
  checkout: "Checkout",
  public_api: "Endpoints públicos",
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${Math.round(seconds / 3600)}h`;
};

const RateLimitLogs = () => {
  const [logs, setLogs] = useState<RateLimitLog[]>([]);
  const [blocks, setBlocks] = useState<ActiveBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ruleFilter, setRuleFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setIsLoading(true);
    const [logsRes, blocksRes] = await Promise.all([
      supabase
        .from("rate_limit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("rate_limit_blocks")
        .select("id, identity_key, rule_key, strikes, blocked_until")
        .order("blocked_until", { ascending: false })
        .limit(100),
    ]);
    if (!logsRes.error) setLogs((logsRes.data || []) as unknown as RateLimitLog[]);
    if (!blocksRes.error) setBlocks((blocksRes.data || []) as unknown as ActiveBlock[]);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const activeBlocks = useMemo(
    () => blocks.filter((b) => b.blocked_until && new Date(b.blocked_until) > new Date()),
    [blocks]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (ruleFilter !== "all" && l.rule_key !== ruleFilter) return false;
      if (!term) return true;
      return (
        (l.user_email || "").toLowerCase().includes(term) ||
        (l.ip_address || "").toLowerCase().includes(term) ||
        (l.endpoint || "").toLowerCase().includes(term)
      );
    });
  }, [logs, ruleFilter, search]);

  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return logs.filter((l) => new Date(l.created_at).getTime() >= cutoff).length;
  }, [logs]);

  const topRule = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((l) => {
      counts[l.rule_key] = (counts[l.rule_key] || 0) + 1;
    });
    const entry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return entry ? RULE_LABELS[entry[0]] || entry[0] : "—";
  }, [logs]);

  const stats = [
    { label: "Bloqueios registrados", value: logs.length as string | number, icon: ShieldAlert },
    { label: "Últimas 24h", value: last24h as string | number, icon: Activity },
    { label: "Bloqueios ativos agora", value: activeBlocks.length as string | number, icon: Ban },
    { label: "Regra mais acionada", value: topRule as string | number, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4 sm:p-6"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center mb-3">
              <s.icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg sm:text-2xl font-bold font-display mb-1 truncate">{s.value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {activeBlocks.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-bold mb-4 flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Bloqueios ativos
          </h3>
          <div className="space-y-2">
            {activeBlocks.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-secondary/50 text-sm"
              >
                <span className="font-mono text-xs break-all">{b.identity_key}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{RULE_LABELS[b.rule_key] || b.rule_key}</Badge>
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                    {b.strikes} reincidência{b.strikes > 1 ? "s" : ""}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    até {new Date(b.blocked_until as string).toLocaleTimeString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h3 className="font-display font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Logs de Rate Limit ({filtered.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar por e-mail, IP ou endpoint"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-64"
            />
            <Select value={ruleFilter} onValueChange={setRuleFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as regras</SelectItem>
                {Object.entries(RULE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            Nenhum limite foi atingido até agora. A plataforma está operando normalmente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Regra</TableHead>
                  <TableHead className="hidden md:table-cell">Usuário</TableHead>
                  <TableHead className="hidden sm:table-cell">IP</TableHead>
                  <TableHead className="hidden lg:table-cell">Endpoint</TableHead>
                  <TableHead>Requisições</TableHead>
                  <TableHead>Bloqueio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{RULE_LABELS[l.rule_key] || l.rule_key}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {l.user_email || (l.user_id ? l.user_id.slice(0, 8) : "Anônimo")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">
                      {l.ip_address || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{l.endpoint}</TableCell>
                    <TableCell className="text-xs">
                      {l.request_count}/{l.max_requests}
                      <span className="text-muted-foreground">
                        {" "}em {formatDuration(l.window_seconds)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        {formatDuration(l.blocked_seconds)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RateLimitLogs;
