import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, TrendingUp, CheckCircle } from 'lucide-react';
import type { Appointment } from '@/hooks/useAppointments';
import { usePrivacyMode } from '@/contexts/PrivacyModeContext';

interface ThreeMonthViewProps {
  startMonth: Date;
  appointments: Appointment[];
  onDayClick: (date: Date) => void;
  monthlyGoals?: Record<string, number>;
}

export const ThreeMonthView = ({ startMonth, appointments, onDayClick, monthlyGoals = {} }: ThreeMonthViewProps) => {
  const months = useMemo(() => [
    startMonth,
    addMonths(startMonth, 1),
    addMonths(startMonth, 2),
  ], [startMonth]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      if (!map[apt.appointment_date]) map[apt.appointment_date] = [];
      map[apt.appointment_date].push(apt);
    });
    return map;
  }, [appointments]);

  const getMonthStats = (month: Date) => {
    const monthStr = format(month, 'yyyy-MM');
    const monthApts = appointments.filter((a) => a.appointment_date.startsWith(monthStr));
    const completed = monthApts.filter((a) => a.status === 'completed').length;
    const scheduled = monthApts.filter((a) => a.status === 'scheduled').length;
    const total = monthApts.length;
    const revenue = monthApts
      .filter((a) => a.status === 'completed')
      .reduce((sum, a) => sum + a.service_value, 0);
    const goal = monthlyGoals[monthStr] || 0;

    return { completed, scheduled, total, revenue, goal };
  };

  const weekDayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const getCalendarDays = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {months.map((month) => {
          const stats = getMonthStats(month);
          const progressPercent = stats.goal > 0 ? Math.min(100, (stats.total / stats.goal) * 100) : 0;

          return (
            <Card key={format(month, 'yyyy-MM')} className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  {format(month, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Agendados</span>
                  <span className="font-semibold">{stats.scheduled}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Concluídos</span>
                  <span className="font-semibold text-emerald-600">{stats.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Faturamento</span>
                  <span className="font-semibold text-primary">{formatCurrency(stats.revenue)}</span>
                </div>
                {stats.goal > 0 && (
                  <div className="pt-1">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Meta: {stats.goal} atendimentos</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mini Calendars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {months.map((month) => {
          const calendarDays = getCalendarDays(month);

          return (
            <Card key={format(month, 'yyyy-MM')} className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize text-center">
                  {format(month, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {/* Week day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {weekDayNames.map((name, i) => (
                    <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-1">
                      {name}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, index) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayApts = appointmentsByDate[dateStr] || [];
                    const isCurrentMonth = isSameMonth(day, month);
                    const isTodayDate = isToday(day);
                    const hasScheduled = dayApts.some((a) => a.status === 'scheduled');
                    const allCompleted = dayApts.length > 0 && dayApts.every((a) => a.status === 'completed');
                    const isFull = dayApts.length >= 5; // Consider "full" at 5+ appointments

                    let bgClass = '';
                    if (!isCurrentMonth) {
                      bgClass = 'opacity-30';
                    } else if (isFull) {
                      bgClass = 'bg-destructive/20 text-destructive';
                    } else if (allCompleted) {
                      bgClass = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
                    } else if (hasScheduled) {
                      bgClass = 'bg-primary/20 text-primary';
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => onDayClick(day)}
                        className={`text-[11px] sm:text-xs p-1 rounded-md text-center transition-colors hover:bg-secondary/50 relative ${bgClass} ${
                          isTodayDate ? 'ring-1 ring-primary font-bold' : ''
                        }`}
                      >
                        {format(day, 'd')}
                        {dayApts.length > 0 && isCurrentMonth && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary" /> Agendado
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Concluído
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-destructive" /> Lotado
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
