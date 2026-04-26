import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, User, AlertTriangle, Pencil, Trash2, Gauge } from 'lucide-react';
import { OrdemServico } from '@/hooks/useOrdensServico';
import { cn } from '@/lib/utils';

interface Props {
  ordem: OrdemServico;
  onEdit: (o: OrdemServico) => void;
  onDelete: (id: string) => void;
}

const statusLabel: Record<OrdemServico['status'], string> = {
  aguardando: 'Aguardando',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
};

const statusClasses: Record<OrdemServico['status'], string> = {
  aguardando: 'bg-muted text-muted-foreground border-border',
  em_andamento: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  concluido: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export function OrdemServicoCard({ ordem, onEdit, onDelete }: Props) {
  const isUrgente = ordem.prioridade === 'urgente';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card border rounded-xl p-4 hover:border-primary/30 transition-colors',
        isUrgente ? 'border-destructive/40 ring-1 ring-destructive/20' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-base truncate">
              {ordem.modelo_veiculo || ordem.cliente_nome}
            </h3>
            {ordem.placa && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                {ordem.placa}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{ordem.cliente_nome}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(ordem)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(ordem.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="outline" className={cn('text-xs', statusClasses[ordem.status])}>
          {statusLabel[ordem.status]}
        </Badge>
        {isUrgente && (
          <Badge variant="outline" className="text-xs bg-destructive/15 text-destructive border-destructive/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgente
          </Badge>
        )}
      </div>

      {(ordem.ano_veiculo || ordem.cor || ordem.quilometragem) && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
          {ordem.ano_veiculo && (
            <span className="flex items-center gap-1"><Car className="w-3 h-3" />{ordem.ano_veiculo}</span>
          )}
          {ordem.cor && <span>• {ordem.cor}</span>}
          {ordem.quilometragem && (
            <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{ordem.quilometragem}</span>
          )}
        </div>
      )}

      <p className="text-sm text-foreground/80 line-clamp-3 mb-3">
        {ordem.descricao_servico}
      </p>

      {ordem.responsavel_nome && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border">
          <User className="w-3 h-3" />
          <span>Responsável: <span className="text-foreground">{ordem.responsavel_nome}</span></span>
        </div>
      )}
    </motion.div>
  );
}