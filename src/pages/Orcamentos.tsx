import { useState, useEffect } from "react";
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
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