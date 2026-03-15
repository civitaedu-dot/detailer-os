import { useState, useEffect } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, RefreshCw, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuotes, useCompanySettings } from "@/hooks/useQuotes";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { QuotesDashboard } from "@/components/orcamentos/QuotesDashboard";
import { QuoteFormModal } from "@/components/orcamentos/QuoteFormModal";
import type { Quote } from "@/hooks/useQuotes";
import type { QuoteStatus } from "@/components/orcamentos/QuoteStatusBadge";
import logo from "@/assets/logo.jpeg";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Orcamentos = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const {
    quotes, isLoading, fetchQuotes, fetchQuoteWithItems,
    getNextQuoteNumber, createQuote, updateQuote, updateQuoteStatus,
    deleteQuote, duplicateQuote,
  } = useQuotes();

  const { clients } = useClients();
  const { services } = useServices();
  const { settings } = useCompanySettings();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [nextNumber, setNextNumber] = useState("ORC-001");
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleRefresh = () => {
    fetchQuotes();
  };

  const handleNew = async () => {
    const number = await getNextQuoteNumber();
    setNextNumber(number);
    setEditingQuote(null);
    setIsFormOpen(true);
  };

  const handleEdit = async (quote: Quote) => {
    const fullQuote = await fetchQuoteWithItems(quote.id);
    if (fullQuote) {
      setEditingQuote(fullQuote);
      setIsFormOpen(true);
    }
  };

  const handleView = (quote: Quote) => {
    // For now just edit. Later could be a read-only view
    handleEdit(quote);
  };

  const handleSave = async (formData: any) => {
    setIsSaving(true);
    try {
      if (editingQuote) {
        const success = await updateQuote(editingQuote.id, formData);
        return success ? editingQuote : null;
      } else {
        return await createQuote(formData);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (quote: Quote, status: QuoteStatus) => {
    await updateQuoteStatus(quote.id, status, quote.status);
  };

  const handleDuplicate = async (quote: Quote) => {
    const fullQuote = await fetchQuoteWithItems(quote.id);
    if (fullQuote) {
      await duplicateQuote(fullQuote);
    }
  };

  useEffect(() => {
    getNextQuoteNumber().then(setNextNumber);
  }, [getNextQuoteNumber]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={logo} alt="DetailerOS Logo" className="w-8 h-8 rounded-lg object-contain" />
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
              <Link to="/orcamentos">Orçamentos</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/agenda">Agenda</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/clientes">Clientes</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/servicos">Serviços</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/configuracoes">Config.</Link>
            </Button>
          </nav>

          <div className="flex items-center gap-1">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                  <span className="text-xs font-semibold text-primary">
                    {profile?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <span className="hidden sm:block">{profile?.name || "Usuário"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar dados
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h2 className="font-display text-2xl font-bold mb-1 flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary" />
              Orçamentos
            </h2>
            <p className="text-muted-foreground text-sm">
              Gerencie propostas comerciais e acompanhe negociações
            </p>
          </div>
        </motion.div>

        {/* Dashboard */}
        <QuotesDashboard
          quotes={quotes}
          isLoading={isLoading}
          onNew={handleNew}
          onEdit={handleEdit}
          onView={handleView}
          onDuplicate={handleDuplicate}
          onDelete={deleteQuote}
          onStatusChange={handleStatusChange}
        />
      </main>

      {/* Form Modal */}
      <QuoteFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        clients={clients}
        services={services}
        settings={settings}
        initialData={editingQuote}
        nextQuoteNumber={nextNumber}
        isSaving={isSaving}
      />
    </div>
  );
};

export default Orcamentos;