import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText, Plus, Search, Filter, Copy, Trash2, Eye,
  TrendingUp, DollarSign, Clock, CheckCircle, ChevronDown,
  MoreVertical, Edit, BarChart2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QuoteStatusBadge, statusOptions, type QuoteStatus } from "./QuoteStatusBadge";
import type { Quote } from "@/hooks/useQuotes";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  quotes: Quote[];
  isLoading: boolean;
  onNew: () => void;
  onEdit: (quote: Quote) => void;
  onView: (quote: Quote) => void;
  onDuplicate: (quote: Quote) => void;
  onDelete: (id: string) => void;
  onStatusChange: (quote: Quote, status: QuoteStatus) => void;
}

const MetricCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) => (
  <Card className="border-border bg-card">
    <CardContent className="p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold font-display leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

export const QuotesDashboard = ({
  quotes,
  isLoading,
  onNew,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  onStatusChange,
}: Props) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Metrics
  const metrics = useMemo(() => {
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    const monthQuotes = quotes.filter(q => new Date(q.created_date) >= monthStart);
    const open = quotes.filter(q => q.status === "sent");
    const approved = quotes.filter(q => q.status === "approved");
    const sent = quotes.filter(q => ["sent", "approved", "rejected"].includes(q.status));
    const convRate = sent.length > 0 ? Math.round((approved.length / sent.length) * 100) : 0;
    const avgTicket = quotes.length > 0 ? quotes.reduce((s, q) => s + q.total, 0) / quotes.length : 0;
    const openValue = open.reduce((s, q) => s + q.total, 0);
    return { monthCount: monthQuotes.length, openValue, convRate, avgTicket };
  }, [quotes]);

  const filtered = useMemo(() => {
    return quotes.filter(q => {
      const matchSearch = !search ||
        q.client_name.toLowerCase().includes(search.toLowerCase()) ||
        q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
        (q.title || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || q.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [quotes, search, filterStatus]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-card rounded-xl animate-pulse border border-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={FileText}
          label="Orçamentos este mês"
          value={String(metrics.monthCount)}
          color="bg-primary/15 text-primary"
        />
        <MetricCard
          icon={DollarSign}
          label="Em aberto (aguardando)"
          value={fmt(metrics.openValue)}
          color="bg-info/15 text-info"
        />
        <MetricCard
          icon={TrendingUp}
          label="Taxa de conversão"
          value={`${metrics.convRate}%`}
          sub="Aprovados / Enviados"
          color="bg-success/15 text-success"
        />
        <MetricCard
          icon={BarChart2}
          label="Ticket médio"
          value={fmt(metrics.avgTicket)}
          color="bg-warning/15 text-warning"
        />
      </div>

      {/* Search & Filters + CTA */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, número ou serviço..."
            className="pl-9 bg-card border-border"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-border">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statusOptions.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onNew} className="bg-gradient-primary text-primary-foreground gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" />
          Novo Orçamento
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {quotes.length === 0
              ? "Nenhum orçamento criado ainda"
              : "Nenhum orçamento encontrado com os filtros selecionados"}
          </p>
          {quotes.length === 0 && (
            <Button onClick={onNew} variant="outline" size="sm" className="mt-2">
              <Plus className="w-4 h-4 mr-2" /> Criar primeiro orçamento
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((quote, idx) => (
            <motion.div
              key={quote.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {quote.quote_number}
                        </span>
                        <QuoteStatusBadge status={quote.status} />
                        {quote.expiry_date && new Date(quote.expiry_date) < new Date() && quote.status === 'sent' && (
                          <span className="text-xs text-warning flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Expirado
                          </span>
                        )}
                      </div>
                      <p className="font-semibold mt-1 truncate">{quote.client_name}</p>
                      {quote.title && (
                        <p className="text-sm text-muted-foreground truncate">{quote.title}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(quote.created_date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        {quote.expiry_date && (
                          <span className="text-xs text-muted-foreground">
                            Válido até {new Date(quote.expiry_date + "T12:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="font-bold text-lg text-foreground">{fmt(quote.total)}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => onView(quote)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => onEdit(quote)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 px-2">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Alterar status
                            </div>
                            {statusOptions.map(s => (
                              <DropdownMenuItem
                                key={s.value}
                                onClick={() => onStatusChange(quote, s.value)}
                                className={quote.status === s.value ? "text-primary font-medium" : ""}
                              >
                                {quote.status === s.value && <CheckCircle className="w-3 h-3 mr-2" />}
                                {s.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDuplicate(quote)}>
                              <Copy className="w-4 h-4 mr-2" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteId(quote.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O orçamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
