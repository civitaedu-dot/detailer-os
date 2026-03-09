import { Badge } from "@/components/ui/badge";

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Enviado', className: 'bg-info/15 text-info border-info/30' },
  approved: { label: 'Aprovado', className: 'bg-success/15 text-success border-success/30' },
  rejected: { label: 'Reprovado', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  expired: { label: 'Expirado', className: 'bg-warning/15 text-warning border-warning/30' },
};

interface Props {
  status: QuoteStatus;
  className?: string;
}

export const QuoteStatusBadge = ({ status, className }: Props) => {
  const cfg = statusConfig[status] ?? statusConfig.draft;
  return (
    <Badge variant="outline" className={`${cfg.className} font-medium ${className ?? ''}`}>
      {cfg.label}
    </Badge>
  );
};

export const statusOptions: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'sent', label: 'Enviado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Reprovado' },
  { value: 'expired', label: 'Expirado' },
];
