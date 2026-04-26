import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/useClients';
import { OrdemServico, OrdemServicoFormData, useOrdensServico } from '@/hooks/useOrdensServico';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem?: OrdemServico | null;
  defaultClienteId?: string;
}

const emptyForm = (defaultClienteId?: string, defaultClienteNome?: string): OrdemServicoFormData => ({
  cliente_id: defaultClienteId || null,
  cliente_nome: defaultClienteNome || '',
  modelo_veiculo: '',
  ano_veiculo: '',
  placa: '',
  cor: '',
  quilometragem: '',
  descricao_servico: '',
  responsavel_nome: '',
  responsavel_id: null,
  observacoes: '',
  status: 'aguardando',
  prioridade: 'normal',
});

export function OrdemServicoModal({ open, onOpenChange, ordem, defaultClienteId }: Props) {
  const { clients } = useClients();
  const { createOrdem, updateOrdem } = useOrdensServico();
  const [form, setForm] = useState<OrdemServicoFormData>(emptyForm(defaultClienteId));
  const [submitting, setSubmitting] = useState(false);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (ordem) {
        setForm({
          cliente_id: ordem.cliente_id,
          cliente_nome: ordem.cliente_nome,
          modelo_veiculo: ordem.modelo_veiculo || '',
          ano_veiculo: ordem.ano_veiculo || '',
          placa: ordem.placa || '',
          cor: ordem.cor || '',
          quilometragem: ordem.quilometragem || '',
          descricao_servico: ordem.descricao_servico,
          responsavel_nome: ordem.responsavel_nome || '',
          responsavel_id: ordem.responsavel_id,
          observacoes: ordem.observacoes || '',
          status: ordem.status,
          prioridade: ordem.prioridade,
        });
      } else {
        const c = defaultClienteId ? clients.find((cl) => cl.id === defaultClienteId) : null;
        setForm(emptyForm(defaultClienteId, c?.name));
      }
    }
  }, [open, ordem, defaultClienteId, clients]);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients]
  );

  const handleSelectCliente = (id: string) => {
    const c = clients.find((cl) => cl.id === id);
    if (!c) return;
    setForm((prev) => ({
      ...prev,
      cliente_id: c.id,
      cliente_nome: c.name,
      // Sugerir veículo se vazio
      modelo_veiculo: prev.modelo_veiculo || c.vehicle || '',
    }));
    setClientPopoverOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_nome.trim() || !form.descricao_servico.trim()) return;
    setSubmitting(true);
    const ok = ordem
      ? await updateOrdem(ordem.id, form)
      : !!(await createOrdem(form));
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ordem ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div>
            <Label>Cliente *</Label>
            <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {form.cliente_nome || 'Buscar cliente...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandList>
                    <CommandEmpty>
                      <div className="p-2 text-sm">
                        Nenhum cliente encontrado.
                        <br />
                        Você pode digitar o nome manualmente abaixo.
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {sortedClients.map((c) => (
                        <CommandItem key={c.id} value={c.name} onSelect={() => handleSelectCliente(c.id)}>
                          <Check className={cn('mr-2 h-4 w-4', form.cliente_id === c.id ? 'opacity-100' : 'opacity-0')} />
                          <div className="flex flex-col">
                            <span>{c.name}</span>
                            {c.vehicle && <span className="text-xs text-muted-foreground">{c.vehicle}</span>}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Input
              className="mt-2"
              placeholder="Ou digite o nome do cliente"
              value={form.cliente_nome}
              onChange={(e) => setForm((p) => ({ ...p, cliente_nome: e.target.value, cliente_id: null }))}
              required
            />
          </div>

          {/* Veículo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="modelo">Modelo do veículo</Label>
              <Input
                id="modelo"
                value={form.modelo_veiculo}
                onChange={(e) => setForm((p) => ({ ...p, modelo_veiculo: e.target.value }))}
                placeholder="Ex: Honda Civic"
              />
            </div>
            <div>
              <Label htmlFor="ano">Ano</Label>
              <Input
                id="ano"
                value={form.ano_veiculo}
                onChange={(e) => setForm((p) => ({ ...p, ano_veiculo: e.target.value }))}
                placeholder="2022"
              />
            </div>
            <div>
              <Label htmlFor="placa">Placa</Label>
              <Input
                id="placa"
                value={form.placa}
                onChange={(e) => setForm((p) => ({ ...p, placa: e.target.value.toUpperCase() }))}
                placeholder="ABC-1234"
              />
            </div>
            <div>
              <Label htmlFor="cor">Cor</Label>
              <Input
                id="cor"
                value={form.cor}
                onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))}
                placeholder="Preto"
              />
            </div>
            <div>
              <Label htmlFor="km">Quilometragem</Label>
              <Input
                id="km"
                value={form.quilometragem}
                onChange={(e) => setForm((p) => ({ ...p, quilometragem: e.target.value }))}
                placeholder="45.000 km"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="descricao">O que precisa ser feito *</Label>
            <Textarea
              id="descricao"
              value={form.descricao_servico}
              onChange={(e) => setForm((p) => ({ ...p, descricao_servico: e.target.value }))}
              placeholder="Descreva detalhadamente os serviços a executar neste veículo..."
              rows={5}
              required
            />
          </div>

          {/* Responsável */}
          <div>
            <Label htmlFor="responsavel">Responsável pelo serviço</Label>
            <Input
              id="responsavel"
              value={form.responsavel_nome}
              onChange={(e) => setForm((p) => ({ ...p, responsavel_nome: e.target.value }))}
              placeholder="Nome do profissional"
            />
          </div>

          {/* Status / Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as OrdemServicoFormData['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm((p) => ({ ...p, prioridade: v as OrdemServicoFormData['prioridade'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="obs">Observações adicionais</Label>
            <Textarea
              id="obs"
              value={form.observacoes}
              onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
              placeholder="Anotações internas..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={submitting || !form.cliente_nome.trim() || !form.descricao_servico.trim()}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {ordem ? 'Salvar' : 'Criar Ordem'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}