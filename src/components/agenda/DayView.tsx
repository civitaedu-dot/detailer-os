import { motion } from 'framer-motion';
import { Calendar, Plus, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppointmentCard } from './AppointmentCard';
import type { Appointment } from '@/hooks/useAppointments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onNewAppointment: () => void;
  onEditAppointment: (appointment: Appointment) => void;
  onStatusChange: (id: string, status: string) => void;
  onDeleteAppointment: (id: string) => void;
  isLoading: boolean;
}

export const DayView = ({
  selectedDate,
  appointments,
  onNewAppointment,
  onEditAppointment,
  onStatusChange,
  onDeleteAppointment,
  isLoading,
}: DayViewProps) => {
  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });

  const sortedAppointments = [...appointments].sort((a, b) => {
    const timeA = a.appointment_time || '00:00';
    const timeB = b.appointment_time || '00:00';
    return timeA.localeCompare(timeB);
  });

  const calculateDailyTotal = () => {
    return appointments
      .filter((apt) => apt.status === 'completed')
      .reduce((sum, apt) => sum + apt.service_value, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold capitalize flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            {formattedDate}
          </h2>
          <p className="text-sm text-muted-foreground">
            {appointments.length === 0
              ? 'Nenhum agendamento'
              : `${appointments.length} agendamento${appointments.length > 1 ? 's' : ''}`}
            {calculateDailyTotal() > 0 && (
              <span className="ml-2 text-primary font-medium">
                • {formatCurrency(calculateDailyTotal())} concluído
              </span>
            )}
          </p>
        </div>
        <Button onClick={onNewAppointment} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Nenhum agendamento</h3>
          <p className="text-muted-foreground mb-4">
            Você não tem atendimentos marcados para este dia.
          </p>
          <Button onClick={onNewAppointment} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar primeiro agendamento
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {sortedAppointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AppointmentCard
                appointment={appointment}
                onEdit={onEditAppointment}
                onStatusChange={onStatusChange}
                onDelete={onDeleteAppointment}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
