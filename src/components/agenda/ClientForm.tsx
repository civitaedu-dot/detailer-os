import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { ClientFormData } from '@/hooks/useClients';

interface ClientFormProps {
  onSubmit: (data: ClientFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ClientForm = ({ onSubmit, onCancel, isLoading }: ClientFormProps) => {
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    phone: '',
    birthdate: '',
    vehicle: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-secondary/50 rounded-lg border border-border">
        <h4 className="font-semibold mb-4 text-sm">Novo Cliente</h4>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="client-name">Nome completo *</Label>
            <Input
              id="client-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nome do cliente"
              required
            />
          </div>

          <div>
            <Label htmlFor="client-phone">Telefone *</Label>
            <Input
              id="client-phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div>
            <Label htmlFor="client-birthdate">Data de nascimento</Label>
            <Input
              id="client-birthdate"
              type="date"
              value={formData.birthdate}
              onChange={(e) => handleChange('birthdate', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="client-vehicle">Veículo</Label>
            <Input
              id="client-vehicle"
              value={formData.vehicle}
              onChange={(e) => handleChange('vehicle', e.target.value)}
              placeholder="Ex: Honda Civic Preto 2022"
            />
          </div>

          <div>
            <Label htmlFor="client-notes">Observações</Label>
            <Textarea
              id="client-notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Anotações sobre o cliente..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || !formData.name || !formData.phone} className="flex-1">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Cliente
          </Button>
        </div>
      </div>
    </form>
  );
};
