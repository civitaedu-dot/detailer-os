import { useState } from 'react';
import { Send, Users, MessageCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { replaceTemplateVariables } from '@/hooks/useMessageTemplates';
import { useWhatsAppHistory } from '@/hooks/useWhatsAppHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface BulkClient {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: BulkClient[];
  category?: string;
}

export const BulkWhatsAppModal = ({ open, onOpenChange, clients, category = 'geral' }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logContact } = useWhatsAppHistory();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const cleanPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const handleBulkSend = async () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setSending(true);
    setProgress(0);

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const personalizedMsg = replaceTemplateVariables(message, {
        nome: client.name,
        servico: '',
        total_visitas: '',
        data_agendamento: '',
      });

      const phone = cleanPhone(client.phone);
      const encoded = encodeURIComponent(personalizedMsg);
      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');

      if (user) {
        await logContact({
          client_id: client.id,
          client_name: client.name,
          template_used: 'disparo_lote',
          message_sent: personalizedMsg,
          category,
        });
      }

      setProgress(((i + 1) / clients.length) * 100);

      // Small delay between opens
      if (i < clients.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    setSending(false);
    setConfirmed(false);
    toast({ title: 'Disparo concluído', description: `${clients.length} conversas abertas no WhatsApp.` });
    onOpenChange(false);
    setMessage('');
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!sending) { onOpenChange(v); setConfirmed(false); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            Disparo em Lote — {clients.length} cliente(s)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {clients.slice(0, 20).map((c) => (
              <Badge key={c.id} variant="secondary" className="text-xs">{c.name}</Badge>
            ))}
            {clients.length > 20 && (
              <Badge variant="outline" className="text-xs">+{clients.length - 20} mais</Badge>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Mensagem (use {'{nome}'} para personalizar)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá {nome}! Temos uma novidade especial para você..."
              className="min-h-[120px] resize-none"
              disabled={sending}
            />
          </div>

          {/* Preview */}
          {message && clients[0] && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Prévia para {clients[0].name}:</p>
              <p className="text-sm">{replaceTemplateVariables(message, { nome: clients[0].name, servico: '', total_visitas: '', data_agendamento: '' })}</p>
            </div>
          )}

          {sending && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Abrindo conversas... {Math.round(progress)}%
              </p>
            </div>
          )}

          {confirmed && !sending && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Serão abertas {clients.length} janelas do WhatsApp. Confirme para prosseguir.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { onOpenChange(false); setConfirmed(false); }} disabled={sending}>
              Cancelar
            </Button>
            <Button
              onClick={handleBulkSend}
              disabled={!message.trim() || sending}
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="w-4 h-4" />
              {confirmed ? `Confirmar envio para ${clients.length}` : `Enviar para ${clients.length} clientes`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
