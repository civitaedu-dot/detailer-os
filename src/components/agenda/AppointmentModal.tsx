import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, User } from 'lucide-react';
import { ClientForm } from './ClientForm';
import type { Client, ClientFormData } from '@/hooks/useClients';
import type { Appointment, AppointmentFormData } from '@/hooks/useAppointments';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  onCreateClient: (data: ClientFormData) => Promise<Client | null>;
  clients: Client[];
  appointment?: Appointment | null;
  selectedDate: Date;
  isLoading?: boolean;
}

const SERVICES = [
  { name: 'Lavagem Simples', value: 50 },
  { name: 'Lavagem Completa', value: 100 },
  { name: 'Higienização Interna', value: 150 },
  { name: 'Polimento Técnico', value: 300 },
  { name: 'Vitrificação', value: 800 },
  { name: 'Proteção de Pintura (PPF)', value: 2500 },
  { name: 'Correção de Pintura', value: 500 },
  { name: 'Cristalização de Vidros', value: 200 },
  { name: 'Limpeza de Motor', value: 100 },
  { name: 'Revitalização de Plásticos', value: 80 },
];

const DURATIONS = [
  { label: '30 minutos', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2 horas', value: 120 },
  { label: '3 horas', value: 180 },
  { label: '4 horas', value: 240 },
  { label: 'Dia inteiro', value: 480 },
];

export const AppointmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  onCreateClient,
  clients,
  appointment,
  selectedDate,
  isLoading,
}: AppointmentModalProps) => {
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [formData, setFormData] = useState<AppointmentFormData>({
    client_id: '',
    client_name: '',
    service_name: '',
    service_value: 0,
    appointment_date: '',
    appointment_time: '',
    duration_minutes: 60,
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        setFormData({
          client_id: appointment.client_id || '',
          client_name: appointment.client_name,
          service_name: appointment.service_name,
          service_value: appointment.service_value,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time || '',
          duration_minutes: appointment.duration_minutes || 60,
          notes: appointment.notes || '',
        });
      } else {
        setFormData({
          client_id: '',
          client_name: '',
          service_name: '',
          service_value: 0,
          appointment_date: selectedDate.toISOString().split('T')[0],
          appointment_time: '',
          duration_minutes: 60,
          notes: '',
        });
      }
      setShowNewClientForm(false);
    }
  }, [isOpen, appointment, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleClientSelect = (clientId: string) => {
    if (clientId === 'new') {
      setShowNewClientForm(true);
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setFormData((prev) => ({
        ...prev,
        client_id: client.id,
        client_name: client.name,
      }));
    }
  };

  const handleServiceSelect = (serviceName: string) => {
    if (serviceName === 'custom') {
      setFormData((prev) => ({
        ...prev,
        service_name: '',
        service_value: 0,
      }));
      return;
    }

    const service = SERVICES.find((s) => s.name === serviceName);
    if (service) {
      setFormData((prev) => ({
        ...prev,
        service_name: service.name,
        service_value: service.value,
      }));
    }
  };

  const handleCreateClient = async (data: ClientFormData) => {
    setIsCreatingClient(true);
    const newClient = await onCreateClient(data);
    setIsCreatingClient(false);

    if (newClient) {
      setFormData((prev) => ({
        ...prev,
        client_id: newClient.id,
        client_name: newClient.name,
      }));
      setShowNewClientForm(false);
    }
  };

  const isValid =
    formData.client_name &&
    formData.service_name &&
    formData.service_value > 0 &&
    formData.appointment_date;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection */}
          {!showNewClientForm ? (
            <div>
              <Label>Cliente *</Label>
              <Select
                value={formData.client_id || undefined}
                onValueChange={handleClientSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Criar novo cliente
                    </div>
                  </SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {client.name}
                        {client.vehicle && (
                          <span className="text-muted-foreground text-xs">
                            - {client.vehicle}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.client_name && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selecionado: {formData.client_name}
                </p>
              )}
            </div>
          ) : (
            <ClientForm
              onSubmit={handleCreateClient}
              onCancel={() => setShowNewClientForm(false)}
              isLoading={isCreatingClient}
            />
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, appointment_date: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="time">Horário</Label>
              <Input
                id="time"
                type="time"
                value={formData.appointment_time}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, appointment_time: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label>Duração estimada</Label>
            <Select
              value={String(formData.duration_minutes)}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, duration_minutes: Number(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a duração" />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((duration) => (
                  <SelectItem key={duration.value} value={String(duration.value)}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service */}
          <div>
            <Label>Serviço *</Label>
            <Select
              value={
                SERVICES.find((s) => s.name === formData.service_name)
                  ? formData.service_name
                  : formData.service_name
                  ? 'custom'
                  : undefined
              }
              onValueChange={handleServiceSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((service) => (
                  <SelectItem key={service.name} value={service.name}>
                    {service.name} - R$ {service.value}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Serviço personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Service Name */}
          {!SERVICES.find((s) => s.name === formData.service_name) && (
            <div>
              <Label htmlFor="custom-service">Nome do serviço *</Label>
              <Input
                id="custom-service"
                value={formData.service_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, service_name: e.target.value }))
                }
                placeholder="Descreva o serviço"
                required
              />
            </div>
          )}

          {/* Value */}
          <div>
            <Label htmlFor="value">Valor (R$) *</Label>
            <Input
              id="value"
              type="number"
              min="0"
              step="0.01"
              value={formData.service_value || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, service_value: Number(e.target.value) }))
              }
              placeholder="0,00"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Anotações sobre o atendimento..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !isValid} className="flex-1">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {appointment ? 'Salvar' : 'Agendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
