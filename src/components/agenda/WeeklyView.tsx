import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Appointment } from '@/hooks/useAppointments';

interface WeeklyViewProps {
  weekStart: Date;
  appointments: Appointment[];
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  selectedDate: Date;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00

export const WeeklyView = ({ weekStart, appointments, onDayClick, onAppointmentClick, selectedDate }: WeeklyViewProps) => {
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const appointmentsByDateHour = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      const hour = apt.appointment_time ? parseInt(apt.appointment_time.substring(0, 2)) : -1;
      const key = `${apt.appointment_date}-${hour}`;
      if (!map[key]) map[key] = [];
      map[key].push(apt);
    });
    return map;
  }, [appointments]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      if (!map[apt.appointment_date]) map[apt.appointment_date] = [];
      map[apt.appointment_date].push(apt);
    });
    return map;
  }, [appointments]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header with day names and counts */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
        <div className="p-2 border-r border-border" />
        {weekDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayApts = appointmentsByDate[dateStr] || [];
          const isTodayDate = isToday(day);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(day)}
              className={`p-2 text-center border-r border-border transition-colors ${
                isSelected ? 'bg-primary/10' : isTodayDate ? 'bg-accent/30' : 'hover:bg-secondary/50'
              }`}
            >
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={`text-lg font-bold ${
                isTodayDate ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''
              }`}>
                {format(day, 'd')}
              </div>
              {dayApts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] mt-0.5">
                  {dayApts.length}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border min-h-[60px]">
            <div className="p-1 text-xs text-muted-foreground text-right pr-2 border-r border-border pt-1">
              {String(hour).padStart(2, '0')}:00
            </div>
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const key = `${dateStr}-${hour}`;
              const hourApts = appointmentsByDateHour[key] || [];

              return (
                <div
                  key={key}
                  className="border-r border-border p-0.5 relative hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => onDayClick(day)}
                >
                  {hourApts.map((apt) => (
                    <motion.div
                      key={apt.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(apt);
                      }}
                      className={`text-[10px] sm:text-xs p-1 rounded cursor-pointer truncate mb-0.5 ${
                        apt.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-l-2 border-emerald-500'
                          : apt.status === 'cancelled'
                          ? 'bg-destructive/20 text-destructive border-l-2 border-destructive'
                          : 'bg-primary/20 text-primary border-l-2 border-primary'
                      }`}
                    >
                      <span className="font-medium">{apt.client_name.split(' ')[0]}</span>
                      <span className="hidden sm:inline text-muted-foreground ml-1">
                        {apt.service_name.substring(0, 15)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
