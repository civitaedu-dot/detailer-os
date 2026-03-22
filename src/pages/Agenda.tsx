import { useState, useMemo } from 'react';
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LogOut, Calendar, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useClients } from '@/hooks/useClients';
import { useAppointments } from '@/hooks/useAppointments';
import { useServices } from '@/hooks/useServices';
import { DayView } from '@/components/agenda/DayView';
import { MonthlyView } from '@/components/agenda/MonthlyView';
import { WeeklyView } from '@/components/agenda/WeeklyView';
import { ThreeMonthView } from '@/components/agenda/ThreeMonthView';
import { AppointmentModal } from '@/components/agenda/AppointmentModal';
import type { Appointment, AppointmentFormData } from '@/hooks/useAppointments';
import type { ClientFormData } from '@/hooks/useClients';
import logo from '@/assets/logo.jpeg';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, startOfMonth, endOfMonth, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ViewMode = 'day' | 'week' | 'month' | '3months';

const Agenda = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { clients, createClient } = useClients();
  const { activeServices } = useServices();

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'day') {
      return undefined; // will use selectedDate directly
    }
    if (viewMode === 'week') {
      const ws = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const we = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return { start: format(ws, 'yyyy-MM-dd'), end: format(we, 'yyyy-MM-dd') };
    }
    if (viewMode === 'month') {
      const ms = startOfMonth(selectedDate);
      const me = endOfMonth(selectedDate);
      // Include days from adjacent months visible in calendar
      const calStart = startOfWeek(ms, { weekStartsOn: 0 });
      const calEnd = endOfWeek(me, { weekStartsOn: 0 });
      return { start: format(calStart, 'yyyy-MM-dd'), end: format(calEnd, 'yyyy-MM-dd') };
    }
    // 3months
    const ms = startOfMonth(selectedDate);
    const me = endOfMonth(addMonths(selectedDate, 2));
    return { start: format(ms, 'yyyy-MM-dd'), end: format(me, 'yyyy-MM-dd') };
  }, [viewMode, selectedDate]);

  const appointmentsOptions = viewMode === 'day' ? selectedDate : { dateRange };

  const {
    appointments,
    isLoading,
    createAppointment,
    updateAppointment,
    updateStatus,
    deleteAppointment,
  } = useAppointments(appointmentsOptions);
  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleSubmitAppointment = async (data: AppointmentFormData) => {
    setIsSubmitting(true);
    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, data);
      } else {
        await createAppointment(data);
      }
      setIsModalOpen(false);
      setEditingAppointment(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClient = async (data: ClientFormData) => {
    return await createClient(data);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateStatus(id, status);
  };

  const handleDeleteAppointment = async (id: string) => {
    await deleteAppointment(id);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    if (viewMode === 'month' || viewMode === '3months') {
      setViewMode('day');
    }
  };

  // Navigation
  const navigateBack = () => {
    if (viewMode === 'day') setSelectedDate(subDays(selectedDate, 1));
    else if (viewMode === 'week') setSelectedDate(subWeeks(selectedDate, 1));
    else if (viewMode === 'month') setSelectedDate(subMonths(selectedDate, 1));
    else setSelectedDate(subMonths(selectedDate, 3));
  };

  const navigateForward = () => {
    if (viewMode === 'day') setSelectedDate(addDays(selectedDate, 1));
    else if (viewMode === 'week') setSelectedDate(addWeeks(selectedDate, 1));
    else if (viewMode === 'month') setSelectedDate(addMonths(selectedDate, 1));
    else setSelectedDate(addMonths(selectedDate, 3));
  };

  const goToToday = () => setSelectedDate(new Date());

  const getNavigationLabel = () => {
    if (viewMode === 'day') return format(selectedDate, "d 'de' MMMM, yyyy", { locale: ptBR });
    if (viewMode === 'week') {
      const ws = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const we = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return `${format(ws, "d MMM", { locale: ptBR })} — ${format(we, "d MMM yyyy", { locale: ptBR })}`;
    }
    if (viewMode === 'month') return format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
    return `${format(selectedDate, "MMM", { locale: ptBR })} — ${format(addMonths(selectedDate, 2), "MMM yyyy", { locale: ptBR })}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-3">
            <Calendar className="w-7 h-7 text-primary" />
            Agenda
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie seus atendimentos e organize sua agenda.
          </p>
        </motion.div>

        {/* View Switcher + Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          {/* View Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full sm:w-auto">
            <TabsList className="w-full sm:w-auto grid grid-cols-4">
              <TabsTrigger value="day" className="gap-1 text-xs sm:text-sm">
                <CalendarDays className="w-3.5 h-3.5 hidden sm:block" />
                Dia
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1 text-xs sm:text-sm">
                <CalendarRange className="w-3.5 h-3.5 hidden sm:block" />
                Semana
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-1 text-xs sm:text-sm">
                <Calendar className="w-3.5 h-3.5 hidden sm:block" />
                Mês
              </TabsTrigger>
              <TabsTrigger value="3months" className="gap-1 text-xs sm:text-sm">
                <LayoutGrid className="w-3.5 h-3.5 hidden sm:block" />
                3 Meses
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateBack}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center capitalize">
                {getNavigationLabel()}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateForward}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {viewMode !== '3months' && (
              <Button onClick={handleNewAppointment} size="sm" className="gap-1">
                + Novo
              </Button>
            )}
          </div>
        </div>

        {/* View Content */}
        {viewMode === 'day' && (
          <DayView
            selectedDate={selectedDate}
            appointments={appointments}
            onNewAppointment={handleNewAppointment}
            onEditAppointment={handleEditAppointment}
            onStatusChange={handleStatusChange}
            onDeleteAppointment={handleDeleteAppointment}
            isLoading={isLoading}
          />
        )}

        {viewMode === 'week' && (
          <WeeklyView
            weekStart={startOfWeek(selectedDate, { weekStartsOn: 0 })}
            appointments={appointments}
            onDayClick={handleDayClick}
            onAppointmentClick={handleEditAppointment}
            selectedDate={selectedDate}
          />
        )}

        {viewMode === 'month' && (
          <MonthlyView
            currentMonth={selectedDate}
            appointments={appointments}
            onDayClick={handleDayClick}
            selectedDate={selectedDate}
          />
        )}

        {viewMode === '3months' && (
          <ThreeMonthView
            startMonth={startOfMonth(selectedDate)}
            appointments={appointments}
            onDayClick={handleDayClick}
          />
        )}
      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAppointment(null);
        }}
        onSubmit={handleSubmitAppointment}
        onCreateClient={handleCreateClient}
        clients={clients}
        services={activeServices}
        appointment={editingAppointment}
        selectedDate={selectedDate}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Agenda;
