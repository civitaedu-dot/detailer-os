import { useState, useMemo } from 'react';
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, LogOut, Download, CalendarIcon, ArrowUpDown, 
  TrendingUp, DollarSign, BarChart3, Filter, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAppointments } from '@/hooks/useAppointments';
import { useClients } from '@/hooks/useClients';
import { useServices } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import logo from '@/assets/logo.jpeg';

type SortKey = 'date' | 'service' | 'client' | 'status' | 'value';
type SortDir = 'asc' | 'desc';
type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  completed: { label: 'Concluído', variant: 'default' },
  scheduled: { label: 'Agendado', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  in_progress: { label: 'Em andamento', variant: 'outline' },
};

const RelatorioServicos = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { appointments } = useAppointments();
  const { clients } = useClients();
  const { services } = useServices();

  // Filters
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterMinValue, setFilterMinValue] = useState<string>('');
  const [filterMaxValue, setFilterMaxValue] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const handlePeriodPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    switch (preset) {
      case 'today':
        setDateFrom(startOfDay(now));
        setDateTo(endOfDay(now));
        break;
      case 'week':
        setDateFrom(startOfWeek(now, { locale: ptBR }));
        setDateTo(endOfWeek(now, { locale: ptBR }));
        break;
      case 'month':
        setDateFrom(startOfMonth(now));
        setDateTo(endOfMonth(now));
        break;
      case 'custom':
        break;
    }
  };

  const filteredData = useMemo(() => {
    return (appointments || []).filter((appt) => {
      // Period
      if (dateFrom && dateTo) {
        const apptDate = parseISO(appt.appointment_date);
        if (!isWithinInterval(apptDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })) return false;
      }
      // Service
      if (filterService !== 'all' && appt.service_name !== filterService) return false;
      // Status
      if (filterStatus !== 'all' && appt.status !== filterStatus) return false;
      // Client
      if (filterClient !== 'all' && appt.client_name !== filterClient) return false;
      // Value range
      const minVal = filterMinValue ? Number(filterMinValue) : null;
      const maxVal = filterMaxValue ? Number(filterMaxValue) : null;
      if (minVal !== null && appt.service_value < minVal) return false;
      if (maxVal !== null && appt.service_value > maxVal) return false;
      return true;
    });
  }, [appointments, dateFrom, dateTo, filterService, filterStatus, filterClient, filterMinValue, filterMaxValue]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date': cmp = a.appointment_date.localeCompare(b.appointment_date); break;
        case 'service': cmp = a.service_name.localeCompare(b.service_name); break;
        case 'client': cmp = a.client_name.localeCompare(b.client_name); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'value': cmp = a.service_value - b.service_value; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Summary
  const summary = useMemo(() => {
    const totalServices = filteredData.length;
    const totalValue = filteredData.reduce((sum, a) => sum + a.service_value, 0);
    const serviceCount: Record<string, number> = {};
    filteredData.forEach((a) => {
      serviceCount[a.service_name] = (serviceCount[a.service_name] || 0) + 1;
    });
    const topService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0];
    return { totalServices, totalValue, topService: topService ? `${topService[0]} (${topService[1]}x)` : '-' };
  }, [filteredData]);

  const uniqueServices = useMemo(() => [...new Set((appointments || []).map((a) => a.service_name))], [appointments]);
  const uniqueClients = useMemo(() => [...new Set((appointments || []).map((a) => a.client_name))], [appointments]);
  const uniqueStatuses = useMemo(() => [...new Set((appointments || []).map((a) => a.status))], [appointments]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const exportCSV = () => {
    const headers = ['Data', 'Serviço', 'Cliente', 'Status', 'Valor'];
    const rows = sortedData.map((a) => [
      format(parseISO(a.appointment_date), 'dd/MM/yyyy'),
      a.service_name,
      a.client_name,
      statusMap[a.status]?.label || a.status,
      a.service_value.toFixed(2).replace('.', ','),
    ]);
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-servicos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  const exportPDF = () => {
    const printContent = `
      <html><head><title>Relatório de Serviços</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
        .summary { display: flex; gap: 16px; margin-bottom: 20px; }
        .summary-card { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; flex: 1; }
        .summary-card .label { font-size: 11px; color: #888; }
        .summary-card .value { font-size: 18px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f0f0f0; text-align: left; padding: 8px; border-bottom: 2px solid #ddd; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #fafafa; }
      </style></head><body>
      <h1>Relatório de Serviços</h1>
      <p class="subtitle">Período: ${dateFrom ? format(dateFrom, 'dd/MM/yyyy') : '-'} a ${dateTo ? format(dateTo, 'dd/MM/yyyy') : '-'}</p>
      <div class="summary">
        <div class="summary-card"><div class="label">Total de Serviços</div><div class="value">${summary.totalServices}</div></div>
        <div class="summary-card"><div class="label">Valor Total</div><div class="value">${formatCurrency(summary.totalValue)}</div></div>
        <div class="summary-card"><div class="label">Mais Realizado</div><div class="value">${summary.topService}</div></div>
      </div>
      <table><thead><tr><th>Data</th><th>Serviço</th><th>Cliente</th><th>Status</th><th>Valor</th></tr></thead><tbody>
      ${sortedData.map((a) => `<tr><td>${format(parseISO(a.appointment_date), 'dd/MM/yyyy')}</td><td>${a.service_name}</td><td>${a.client_name}</td><td>${statusMap[a.status]?.label || a.status}</td><td>${formatCurrency(a.service_value)}</td></tr>`).join('')}
      </tbody></table></body></html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
    toast.success('PDF gerado! Use a janela de impressão para salvar.');
  };

  const clearFilters = () => {
    handlePeriodPreset('month');
    setFilterService('all');
    setFilterStatus('all');
    setFilterClient('all');
    setFilterMinValue('');
    setFilterMaxValue('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-3">
            <FileText className="w-7 h-7 text-primary" />
            Relatório de Serviços
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Visualize e analise todos os serviços realizados.</p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Serviços</p>
                <p className="text-xl sm:text-2xl font-bold">{summary.totalServices}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(summary.totalValue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mais Realizado</p>
                <p className="text-sm sm:text-base font-bold truncate">{summary.topService}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            {/* Period presets + toggle + export */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex flex-wrap gap-1.5">
                {(['today', 'week', 'month', 'custom'] as PeriodPreset[]).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={periodPreset === p ? 'default' : 'outline'}
                    onClick={() => handlePeriodPreset(p)}
                    className="text-xs h-8"
                  >
                    {{ today: 'Hoje', week: 'Semana', month: 'Mês', custom: 'Personalizado' }[p]}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5 h-8">
                  <Filter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8">
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Exportar</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={exportCSV}>Exportar CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportPDF}>Exportar PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Date pickers for custom */}
            {periodPreset === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Data inicial</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !dateFrom && "text-muted-foreground")}>
                        <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                        {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Data final</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !dateTo && "text-muted-foreground")}>
                        <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                        {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Extended filters */}
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Serviço</label>
                    <Select value={filterService} onValueChange={setFilterService}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {uniqueServices.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {uniqueStatuses.map((s) => <SelectItem key={s} value={s}>{statusMap[s]?.label || s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Cliente</label>
                    <Select value={filterClient} onValueChange={setFilterClient}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {uniqueClients.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Faixa de valor</label>
                    <div className="flex gap-2">
                      <Input type="number" placeholder="Mín" value={filterMinValue} onChange={(e) => setFilterMinValue(e.target.value)} className="h-9 text-sm" />
                      <Input type="number" placeholder="Máx" value={filterMaxValue} onChange={(e) => setFilterMaxValue(e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-xs">
                  <X className="w-3.5 h-3.5" /> Limpar filtros
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {([
                    ['date', 'Data'],
                    ['service', 'Serviço'],
                    ['client', 'Cliente'],
                    ['status', 'Status'],
                    ['value', 'Valor'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <TableHead key={key} className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(key)}>
                      <div className="flex items-center gap-1">
                        {label}
                        <ArrowUpDown className={cn("w-3.5 h-3.5", sortKey === key ? 'text-primary' : 'text-muted-foreground/40')} />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Nenhum serviço encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((appt) => {
                    const st = statusMap[appt.status] || { label: appt.status, variant: 'secondary' as const };
                    return (
                      <TableRow key={appt.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(parseISO(appt.appointment_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{appt.service_name}</TableCell>
                        <TableCell className="text-sm">{appt.client_name}</TableCell>
                        <TableCell>
                          <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-semibold whitespace-nowrap">{formatCurrency(appt.service_value)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
    </div>
  );
};

export default RelatorioServicos;
