import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ClipboardList, Plus, Search, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOrdensServico, OrdemServico, OrdemStatus } from '@/hooks/useOrdensServico';
import { OrdemServicoCard } from '@/components/ordens/OrdemServicoCard';
import { OrdemServicoModal } from '@/components/ordens/OrdemServicoModal';

const OrdensServico = () => {
  const { ordens, isLoading, deleteOrdem } = useOrdensServico();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrdemStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrdemServico | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return ordens.filter((o) => {
      const matchSearch =
        !q ||
        o.cliente_nome.toLowerCase().includes(q) ||
        (o.modelo_veiculo || '').toLowerCase().includes(q) ||
        (o.placa || '').toLowerCase().includes(q) ||
        (o.responsavel_nome || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [ordens, search, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (o: OrdemServico) => {
    setEditing(o);
    setModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-primary" />
            Ordens de Serviço
          </h1>
          <p className="text-muted-foreground text-sm">
            Organize o fluxo de trabalho dos veículos no studio.
          </p>
        </div>
        <Button onClick={openNew} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Nova Ordem
        </Button>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, modelo, placa ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrdemStatus | 'all')}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="aguardando">Aguardando</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">
            {search || statusFilter !== 'all' ? 'Nenhuma ordem encontrada' : 'Nenhuma ordem de serviço'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {search || statusFilter !== 'all'
              ? 'Tente ajustar os filtros.'
              : 'Comece criando sua primeira ordem de serviço.'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Criar primeira ordem
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <OrdemServicoCard key={o.id} ordem={o} onEdit={openEdit} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      <OrdemServicoModal open={modalOpen} onOpenChange={setModalOpen} ordem={editing} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ordem de serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteId) await deleteOrdem(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdensServico;