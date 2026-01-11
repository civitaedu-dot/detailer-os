import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const DatePicker = ({ selectedDate, onDateChange }: DatePickerProps) => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 0 }));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => {
    const newStart = addDays(weekStart, -7);
    setWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = addDays(weekStart, 7);
    setWeekStart(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    setWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
    onDateChange(today);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6">
      {/* Month and Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-lg capitalize">
            {format(weekStart, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoje
        </Button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <motion.button
              key={day.toISOString()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDateChange(day)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isTodayDate
                  ? 'bg-secondary text-foreground'
                  : 'hover:bg-secondary/50'
              }`}
            >
              <span className="text-xs uppercase font-medium opacity-70">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span className={`text-lg font-bold ${isSelected ? '' : isTodayDate ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
