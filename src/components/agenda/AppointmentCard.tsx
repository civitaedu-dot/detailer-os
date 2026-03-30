import { motion } from 'framer-motion';
import { Clock, User, Check, X, Pencil, MoreVertical, Phone, CreditCard } from 'lucide-react';
import { usePrivacyMode } from '@/contexts/PrivacyModeContext';
import { getPaymentMethodLabel } from '@/hooks/usePaymentMethodFees';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Appointment } from '@/hooks/useAppointments';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

const statusConfig = {
  scheduled: {
    label: 'Agendado',
    className: 'bg-info/20 text-info border-info/30',
  },
  completed: {
    label: 'Concluído',
    className: 'bg-success/20 text-success border-success/30',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
};

export const AppointmentCard = ({
  appointment,
  onEdit,
  onStatusChange,
  onDelete,
}: AppointmentCardProps) => {
  const status = statusConfig[appointment.status as keyof typeof statusConfig] || statusConfig.scheduled;

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  const { maskCurrency } = usePrivacyMode();
  const formatCurrency = (value: number) => maskCurrency(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Time and Status */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                {formatTime(appointment.appointment_time)}
              </span>
            </div>
            {appointment.duration_minutes && (
              <span className="text-xs text-muted-foreground">
                ({appointment.duration_minutes}min)
              </span>
            )}
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>

          {/* Client */}
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-primary" />
            <span className="font-semibold truncate">{appointment.client_name}</span>
          </div>

          {/* Service */}
          <p className="text-sm text-muted-foreground mb-2 truncate">
            {appointment.service_name}
          </p>

          {/* Value + Payment Method */}
          <div className="flex items-center gap-3 mb-1">
            <p className="text-lg font-bold text-primary">
              {formatCurrency(appointment.service_value)}
            </p>
            {appointment.payment_method && (
              <Badge variant="outline" className="text-xs">
                <CreditCard className="w-3 h-3 mr-1" />
                {getPaymentMethodLabel(appointment.payment_method)}
              </Badge>
            )}
          </div>

          {/* Notes */}
          {appointment.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {appointment.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(appointment)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {appointment.status !== 'completed' && (
              <DropdownMenuItem onClick={() => onStatusChange(appointment.id, 'completed')}>
                <Check className="w-4 h-4 mr-2" />
                Marcar como concluído
              </DropdownMenuItem>
            )}
            {appointment.status !== 'cancelled' && (
              <DropdownMenuItem onClick={() => onStatusChange(appointment.id, 'cancelled')}>
                <X className="w-4 h-4 mr-2" />
                Cancelar atendimento
              </DropdownMenuItem>
            )}
            {appointment.status !== 'scheduled' && (
              <DropdownMenuItem onClick={() => onStatusChange(appointment.id, 'scheduled')}>
                <Clock className="w-4 h-4 mr-2" />
                Marcar como agendado
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(appointment.id)}
              className="text-destructive focus:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};
