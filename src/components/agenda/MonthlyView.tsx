import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { Appointment } from '@/hooks/useAppointments';

interface MonthlyViewProps {
  currentMonth: Date;
  appointments: Appointment[];
  onDayClick: (date: Date) => void;
  selectedDate: Date;
}

export const MonthlyView = ({ currentMonth, appointments, onDayClick, selectedDate }: MonthlyViewProps) => {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      const key = apt.appointment_date;
      if (!map[key]) map[key] = [];
      map[key].push(apt);
    });
    return map;
  }, [appointments]);

  const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDayNames.map((name) => (
          <div key={name} className="p-2 text-center text-xs font-medium text-muted-foreground uppercase">
            {name}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayAppointments = appointmentsByDate[dateStr] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const completed = dayAppointments.filter((a) => a.status === 'completed').length;
          const scheduled = dayAppointments.filter((a) => a.status === 'scheduled').length;
          const cancelled = dayAppointments.filter((a) => a.status === 'cancelled').length;

          return (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDayClick(day)}
              className={`min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-border text-left transition-colors relative ${
                !isCurrentMonth ? 'opacity-40' : ''
              } ${isSelected ? 'bg-primary/10 ring-1 ring-primary' : ''} ${
                isTodayDate ? 'bg-accent/30' : 'hover:bg-secondary/50'
              }`}
            >
              <span className={`text-xs sm:text-sm font-medium ${
                isTodayDate ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''
              }`}>
                {format(day, 'd')}
              </span>

              {dayAppointments.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {/* Show up to 2 appointments on desktop, indicators on mobile */}
                  <div className="hidden sm:block">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate mb-0.5 ${
                          apt.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : apt.status === 'cancelled'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-primary/20 text-primary'
                        }`}
                      >
                        {apt.appointment_time?.substring(0, 5)} {apt.client_name.split(' ')[0]}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{dayAppointments.length - 2} mais
                      </span>
                    )}
                  </div>

                  {/* Mobile: dots */}
                  <div className="flex gap-0.5 sm:hidden flex-wrap">
                    {scheduled > 0 && <div className="w-2 h-2 rounded-full bg-primary" />}
                    {completed > 0 && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                    {cancelled > 0 && <div className="w-2 h-2 rounded-full bg-destructive" />}
                    {dayAppointments.length > 1 && (
                      <span className="text-[9px] text-muted-foreground">{dayAppointments.length}</span>
                    )}
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
