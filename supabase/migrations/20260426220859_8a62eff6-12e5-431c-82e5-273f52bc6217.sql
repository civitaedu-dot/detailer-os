-- Enums
CREATE TYPE public.ordem_status AS ENUM ('aguardando', 'em_andamento', 'concluido');
CREATE TYPE public.ordem_prioridade AS ENUM ('normal', 'urgente');

-- Tabela
CREATE TABLE public.ordens_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  modelo_veiculo TEXT,
  ano_veiculo TEXT,
  placa TEXT,
  cor TEXT,
  quilometragem TEXT,
  descricao_servico TEXT NOT NULL,
  responsavel_nome TEXT,
  responsavel_id UUID,
  observacoes TEXT,
  status public.ordem_status NOT NULL DEFAULT 'aguardando',
  prioridade public.ordem_prioridade NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_ordens_servico_user ON public.ordens_servico(user_id);
CREATE INDEX idx_ordens_servico_cliente ON public.ordens_servico(cliente_id);
CREATE INDEX idx_ordens_servico_status ON public.ordens_servico(status);

-- RLS
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ordens de servico"
ON public.ordens_servico
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ordens de servico"
ON public.ordens_servico
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ordens de servico"
ON public.ordens_servico
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ordens de servico"
ON public.ordens_servico
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER update_ordens_servico_updated_at
BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();