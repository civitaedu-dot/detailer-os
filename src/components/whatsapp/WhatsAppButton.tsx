import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WhatsAppMessageModal } from './WhatsAppMessageModal';

interface WhatsAppButtonProps {
  clientName: string;
  clientPhone: string;
  clientId?: string;
  context?: 'reconquista' | 'aniversario' | 'pos-atendimento' | 'confirmacao' | 'fidelidade' | 'geral';
  daysSinceLastVisit?: number | null;
  totalVisits?: number;
  lastServiceName?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export const WhatsAppButton = ({
  clientName,
  clientPhone,
  clientId,
  context = 'geral',
  daysSinceLastVisit,
  totalVisits,
  lastServiceName,
  variant = 'outline',
  size = 'sm',
  className = '',
  showLabel = true,
}: WhatsAppButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 ${className}`}
        onClick={() => setIsModalOpen(true)}
      >
        <MessageCircle className="w-4 h-4" />
        {showLabel && size !== 'icon' && <span className="hidden sm:inline">WhatsApp</span>}
      </Button>

      <WhatsAppMessageModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        clientName={clientName}
        clientPhone={clientPhone}
        clientId={clientId}
        context={context}
        daysSinceLastVisit={daysSinceLastVisit}
        totalVisits={totalVisits}
        lastServiceName={lastServiceName}
      />
    </>
  );
};
