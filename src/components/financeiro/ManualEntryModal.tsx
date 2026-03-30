import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, DollarSign } from 'lucide-react';
import { toLocalDateString } from '@/lib/utils';
import type { FinancialEntry, FinancialEntryFormData } from '@/hooks/useFinancialEntries';

interface Client {
  id: string;
  name: string;
}

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FinancialEntryFormData) => Promise<FinancialEntry | null>;
  clients?: Client[];
  entryToEdit?: FinancialEntry | null;
}

const entryTypes = [
  { value: 'service', label: 'Serviço' },
  { value: 'product', label: 'Produto' },
  { value: 'other', label: 'Outro' },
];

export function ManualEntryModal({
  isOpen,
  onClose,
  onSubmit,
  clients = [],
  entryToEdit,
}: ManualEntryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FinancialEntryFormData>({
    entry_type: 'service',
    description: '',
    value: 0,
     entry_date: toLocalDateString(new Date()),
    client_id: null,
    client_name: null,
    notes: null,
  });

  useEffect(() => {
    if (isOpen) {
      if (entryToEdit) {
        setFormData({
          entry_type: entryToEdit.entry_type,
          description: entryToEdit.description,
          value: entryToEdit.value,
          entry_date: entryToEdit.entry_date,
          client_id: entryToEdit.client_id,
          client_name: entryToEdit.client_name,
          notes: entryToEdit.notes,
        });
      } else {
        setFormData({
          entry_type: 'service',
          description: '',
          value: 0,
          entry_date: toLocalDateString(new Date()),
          client_id: null,
          client_name: null,
          notes: null,
        });
      }
    }
  }, [isOpen, entryToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await onSubmit(formData);
      if (result) {
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    if (clientId === 'none') {
      setFormData({ ...formData, client_id: null, client_name: null });
    } else {
      const client = clients.find((c) => c.id === clientId);
      setFormData({
        ...formData,
        client_id: clientId,
        client_name: client?.name || null,
      });
    }
  };

  const isValid = formData.description.trim() !== '' && formData.value > 0;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            {entryToEdit ? 'Editar Entrada' : 'Nova Entrada Manual'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entry Type */}
          <div className="space-y-2">
            <Label>Tipo de Entrada *</Label>
            <Select
              value={formData.entry_type}
              onValueChange={(value) =>
                setFormData({ ...formData, entry_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {entryTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ex: Venda de produto, Serviço avulso..."
              maxLength={200}
            />
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor (R$) *</Label>
            <Input
              id="value"
              type="number"
              min="0"
              step="0.01"
              value={formData.value || ''}
              onChange={(e) =>
                setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
              }
              placeholder="0,00"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="entry_date">Data *</Label>
            <Input
              id="entry_date"
              type="date"
              value={formData.entry_date}
              onChange={(e) =>
                setFormData({ ...formData, entry_date: e.target.value })
              }
            />
          </div>

          {/* Client (optional) */}
          <div className="space-y-2">
            <Label>Cliente (opcional)</Label>
            <Select
              value={formData.client_id || 'none'}
              onValueChange={handleClientChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cliente vinculado</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value || null })
              }
              placeholder="Informações adicionais..."
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isValid}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                entryToEdit ? 'Salvar Alterações' : 'Registrar Entrada'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
