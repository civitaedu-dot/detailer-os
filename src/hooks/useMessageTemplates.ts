import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  category: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplateFormData {
  name: string;
  category: string;
  content: string;
}

const DEFAULT_TEMPLATES: Omit<MessageTemplateFormData, 'name'>[] = [];

export const TEMPLATE_CATEGORIES = [
  { value: 'retencao', label: 'Retenção' },
  { value: 'aniversario', label: 'Aniversário' },
  { value: 'pos-atendimento', label: 'Pós-Atendimento' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'confirmacao', label: 'Confirmação de Agenda' },
  { value: 'agradecimento', label: 'Agradecimento' },
  { value: 'reconquista', label: 'Reconquista' },
  { value: 'fidelidade', label: 'Fidelidade' },
  { value: 'geral', label: 'Geral' },
];

export const SMART_MESSAGES: Record<string, { label: string; template: string }[]> = {
  '15_days': [
    {
      label: 'Reaproximação leve',
      template: 'Olá {nome}! 😊 Faz um tempinho que não nos vemos por aqui. Seu veículo está precisando de um cuidado especial? Estamos com a agenda aberta e seria ótimo receber você novamente! Um abraço.'
    },
    {
      label: 'Curiosidade',
      template: 'E aí, {nome}! Tudo bem? Queria saber como está o resultado do último serviço que fizemos. Alguma novidade no carro? Estamos à disposição! 🚗'
    },
  ],
  '30_days': [
    {
      label: 'Exclusividade',
      template: 'Olá {nome}! Notamos que faz um mês desde sua última visita. Preparamos uma condição especial e exclusiva para clientes como você. Que tal agendar um horário essa semana? 🌟'
    },
    {
      label: 'Oferta especial',
      template: '{nome}, tudo bem? Temos uma novidade exclusiva para você! Como cliente especial, preparamos um tratamento diferenciado com condições especiais. Posso te contar mais? 💎'
    },
  ],
  '45_days': [
    {
      label: 'Reconquista direta',
      template: 'Olá {nome}! Sentimos sua falta por aqui. 😊 Sabemos que o dia a dia é corrido, mas seu veículo merece atenção. Estamos oferecendo uma condição imperdível para seu retorno. Vamos agendar? '
    },
    {
      label: 'Proposta de valor',
      template: '{nome}, passamos aqui para lembrar o quanto valorizamos você como cliente. Gostaríamos de oferecer um serviço cortesia na sua próxima visita como forma de agradecimento pela sua confiança. Quando podemos te receber? 🤝'
    },
  ],
  'aniversario': [
    {
      label: 'Parabéns caloroso',
      template: '🎂 Feliz aniversário, {nome}! Que este novo ano traga muitas alegrias! Como presente, preparamos algo especial para você na sua próxima visita. Venha comemorar com a gente! 🎉'
    },
  ],
  'fidelidade': [
    {
      label: 'Reconhecimento',
      template: '{nome}, você é um dos nossos clientes mais especiais! 🏆 São {total_visitas} visitas e queremos agradecer sua confiança. Preparamos um mimo exclusivo na sua próxima passagem por aqui!'
    },
  ],
  'pos-atendimento': [
    {
      label: 'Agradecimento',
      template: 'Olá {nome}! Obrigado por confiar em nós mais uma vez. Esperamos que tenha ficado satisfeito com o {servico}. Qualquer dúvida, estamos à disposição! ⭐'
    },
  ],
  'confirmacao': [
    {
      label: 'Confirmação de agenda',
      template: 'Olá {nome}! Passando para confirmar seu agendamento de {servico} para {data_agendamento}. Podemos contar com sua presença? 📅'
    },
  ],
};

export const replaceTemplateVariables = (
  template: string,
  variables: Record<string, string>
): string => {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  });
  return result;
};

export const useMessageTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('category', { ascending: true });
      if (error) throw error;
      setTemplates((data as MessageTemplate[]) || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createTemplate = async (data: MessageTemplateFormData) => {
    if (!user) return null;
    try {
      const { data: created, error } = await supabase
        .from('message_templates')
        .insert({ user_id: user.id, ...data })
        .select()
        .single();
      if (error) throw error;
      setTemplates((prev) => [...prev, created as MessageTemplate]);
      toast({ title: 'Modelo criado', description: `"${data.name}" salvo com sucesso.` });
      return created;
    } catch (error) {
      console.error('Error creating template:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar o modelo.', variant: 'destructive' });
      return null;
    }
  };

  const updateTemplate = async (id: string, data: Partial<MessageTemplateFormData>) => {
    try {
      const { error } = await supabase.from('message_templates').update(data).eq('id', id);
      if (error) throw error;
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
      toast({ title: 'Modelo atualizado' });
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
      return false;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from('message_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Modelo removido' });
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  return { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, fetchTemplates };
};
