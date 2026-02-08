import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface MonthSelectorProps {
  selectedDate: Date;
  onMonthChange: (date: Date) => void;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function MonthSelector({ selectedDate, onMonthChange }: MonthSelectorProps) {
  const now = new Date();
  const isCurrentMonth =
    selectedDate.getFullYear() === now.getFullYear() &&
    selectedDate.getMonth() === now.getMonth();

  const goToPreviousMonth = () => {
    onMonthChange(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    if (!isCurrentMonth) {
      onMonthChange(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
    }
  };

  const goToCurrentMonth = () => {
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const label = `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPreviousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <button
        onClick={goToCurrentMonth}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isCurrentMonth
            ? "bg-primary/10 text-primary"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        }`}
      >
        <Calendar className="h-3.5 w-3.5" />
        {label}
      </button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={goToNextMonth}
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
