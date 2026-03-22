import { useState, useMemo } from 'react';
import { MessageCircle, Send, Sparkles, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SMART_MESSAGES, replaceTemplateVariables } from '@/hooks/useMessageTemplates';
import { useWhatsAppHistory } from '@/hooks/useWhatsAppHistory';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientPhone: string;
  clientId?: string;
  context?: string;
  daysSinceLastVisit?: number | null;
  totalVisits?: number;
  lastServiceName?: string;
}

export const WhatsAppMessageModal = ({
  open,
  onOpenChange,
  clientName,
  clientPhone,
  clientId,
  context = 'geral',
  daysSinceLastVisit,
  totalVisits,
  lastServiceName,
}: Props) => {
  const { user } = useAuth();
  const { logContact } = useWhatsAppHistory();
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const variables: Record<string, string> = {
    nome: clientName,
    total_visitas: String(totalVisits || 0),
    servico: lastServiceName || 'serviço',
    data_agendamento: '',
  };

  const suggestedCategory = useMemo(() => {
    if (context === 'aniversario') return 'aniversario';
    if (context === 'fidelidade') return 'fidelidade';
    if (context === 'pos-atendimento') return 'pos-atendimento';
    if (context === 'confirmacao') return 'confirmacao';
    if (daysSinceLastVisit && daysSinceLastVisit >= 45) return '45_days';
    if (daysSinceLastVisit && daysSinceLastVisit >= 30) return '30_days';
    if (daysSinceLastVisit && daysSinceLastVisit >= 15) return '15_days';
    return 'pos-atendimento';
  }, [context, daysSinceLastVisit]);

  const suggestions = SMART_MESSAGES[suggestedCategory] || SMART_MESSAGES['pos-atendimento'] || [];

  const applyTemplate = (template: string) => {
    setMessage(replaceTemplateVariables(template, variables));
  };

  const cleanPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const handleSend = async () => {
    const phone = cleanPhone(clientPhone);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');

    if (user) {
      await logContact({
        client_id: clientId || null,
        client_name: clientName,
        template_used: suggestedCategory,
        message_sent: message,
        category: context,
      });
    }

    onOpenChange(false);
    setMessage('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-500" />
            WhatsApp para {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{clientPhone}</Badge>
            {daysSinceLastVisit != null && (
              <Badge variant={daysSinceLastVisit > 30 ? 'destructive' : 'secondary'}>
                {daysSinceLastVisit}d sem visita
              </Badge>
            )}
            {totalVisits != null && totalVisits > 0 && (
              <Badge variant="secondary">{totalVisits} visitas</Badge>
            )}
          </div>

          {/* Smart suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Sugestões inteligentes
              </p>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => applyTemplate(s.template)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-xs font-medium text-primary mb-1">{s.label}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {replaceTemplateVariables(s.template, variables)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Mensagem</label>
              <span className="text-xs text-muted-foreground">{message.length} caracteres</span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite ou selecione uma sugestão acima..."
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Variáveis: {'{nome}'}, {'{servico}'}, {'{total_visitas}'}, {'{data_agendamento}'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!message} className="gap-1.5">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button
              onClick={handleSend}
              disabled={!message.trim()}
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="w-4 h-4" />
              Enviar pelo WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
