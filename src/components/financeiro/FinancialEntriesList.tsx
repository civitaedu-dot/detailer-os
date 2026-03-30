import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  DollarSign,
  Calendar,
  User,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  FileText,
} from 'lucide-react';
import type { FinancialEntry } from '@/hooks/useFinancialEntries';
import { usePrivacyMode } from '@/contexts/PrivacyModeContext';

interface FinancialEntriesListProps {
  entries: FinancialEntry[];
  isLoading: boolean;
  onAddManual?: () => void;
  onEdit?: (entry: FinancialEntry) => void;
  onDelete?: (id: string) => void;
}

const entryTypeLabels: Record<string, { label: string; className: string }> = {
  service: { label: 'Serviço', className: 'bg-primary/20 text-primary border-primary/30' },
  product: { label: 'Produto', className: 'bg-success/20 text-success border-success/30' },
  other: { label: 'Outro', className: 'bg-warning/20 text-warning border-warning/30' },
};

export function FinancialEntriesList({
  entries,
  isLoading,
  onAddManual,
  onEdit,
  onDelete,
}: FinancialEntriesListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const total = entries.reduce((sum, entry) => sum + Number(entry.value), 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5 text-primary" />
            Entradas Financeiras
          </CardTitle>
          {onAddManual && (
            <Button size="sm" onClick={onAddManual}>
              <Plus className="w-4 h-4 mr-1" />
              Entrada Manual
            </Button>
          )}
        </div>
        {entries.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Total do mês: <span className="font-bold text-primary">{formatCurrency(total)}</span>
            {' · '}{entries.length} entrada{entries.length !== 1 ? 's' : ''}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma entrada financeira este mês</p>
            <p className="text-xs mt-1">
              Conclua atendimentos na agenda ou adicione entradas manuais
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {entries.map((entry, index) => {
              const typeConfig = entryTypeLabels[entry.entry_type] || entryTypeLabels.other;
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={typeConfig.className}>
                        {typeConfig.label}
                      </Badge>
                      {entry.is_automatic && (
                        <Badge variant="outline" className="bg-info/10 text-info border-info/30 text-xs">
                          Automático
                        </Badge>
                      )}
                    </div>
                    
                    <p className="font-medium truncate">{entry.description}</p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.entry_date)}
                      </span>
                      {entry.client_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {entry.client_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    <span className="font-bold text-primary whitespace-nowrap">
                      {formatCurrency(entry.value)}
                    </span>

                    {!entry.is_automatic && onEdit && onDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(entry)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(entry.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
