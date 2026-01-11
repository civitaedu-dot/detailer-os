import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LogOut, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useClients } from '@/hooks/useClients';
import { useAppointments } from '@/hooks/useAppointments';
import { DatePicker } from '@/components/agenda/DatePicker';
import { DayView } from '@/components/agenda/DayView';
import { AppointmentModal } from '@/components/agenda/AppointmentModal';
import type { Appointment, AppointmentFormData } from '@/hooks/useAppointments';
import type { ClientFormData } from '@/hooks/useClients';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Agenda = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { clients, createClient } = useClients();
  const {
    appointments,
    isLoading,
    createAppointment,
    updateAppointment,
    updateStatus,
    deleteAppointment,
    fetchAppointments,
  } = useAppointments(selectedDate);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

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

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-sm">D</span>
              </div>
              <span className="font-display font-semibold hidden sm:block">
                Detailer<span className="text-primary">OS</span>
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/financeiro">Financeiro</Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link to="/agenda">Agenda</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/clientes">Clientes</Link>
            </Button>
          </nav>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                  <span className="text-xs font-semibold text-primary">
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="hidden sm:block">{profile?.name || 'Usuário'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-8">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3">
            <Calendar className="w-7 h-7 text-primary" />
            Agenda
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus atendimentos e organize seu dia.
          </p>
        </motion.div>

        {/* Date Picker */}
        <DatePicker selectedDate={selectedDate} onDateChange={handleDateChange} />

        {/* Day View */}
        <DayView
          selectedDate={selectedDate}
          appointments={appointments}
          onNewAppointment={handleNewAppointment}
          onEditAppointment={handleEditAppointment}
          onStatusChange={handleStatusChange}
          onDeleteAppointment={handleDeleteAppointment}
          isLoading={isLoading}
        />
      </main>

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
        appointment={editingAppointment}
        selectedDate={selectedDate}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Agenda;
