import React, { useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Sparkles } from 'lucide-react';

const allQuickReplies = [
  {
    title: 'Saudação',
    content: 'Olá! Agradecemos seu contato. Como podemos ajudar você hoje?',
    keywords: ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi']
  },
  {
    title: 'Horário de Funcionamento',
    content: 'Nosso horário de funcionamento é de segunda a sexta, das 9h às 18h.',
    keywords: ['horário', 'funcionamento', 'aberto', 'fechado', 'atende', 'horas']
  },
  {
    title: 'Agendamento de Consulta',
    content: 'Para agendar uma consulta, por favor, informe seu nome completo e o melhor horário para você.',
    keywords: ['agendar', 'consulta', 'marcar', 'agendamento', 'horário', 'disponível', 'data']
  },
  {
    title: 'Agradecimento',
    content: 'Obrigado por entrar em contato! Estamos à disposição para qualquer outra dúvida.',
    keywords: ['obrigado', 'obrigada', 'valeu', 'agradeço', 'thanks', 'grato']
  },
  {
    title: 'Encaminhamento',
    content: 'Vou encaminhar sua solicitação para o setor responsável e em breve eles entrarão em contato.',
    keywords: ['encaminhar', 'transferir', 'falar com', 'responsável', 'setor']
  },
  {
    title: 'Preços e Valores',
    content: 'Para informações sobre valores e planos, gostaria de agendar uma consulta para uma avaliação personalizada?',
    keywords: ['preço', 'valor', 'quanto custa', 'custo', 'pagamento', 'parcela']
  },
  {
    title: 'Confirmação de Agendamento',
    content: 'Seu agendamento está confirmado! Enviaremos um lembrete 24h antes da consulta.',
    keywords: ['confirmar', 'confirmação', 'confirmado', 'marcado']
  },
  {
    title: 'Cancelamento',
    content: 'Entendemos. Caso queira reagendar, estamos à disposição. Para cancelar, confirme por favor.',
    keywords: ['cancelar', 'cancelamento', 'desmarcar', 'não posso', 'não vou']
  }
];

const QuickReplyPopover = ({ children, onSelectQuickReply, messages = [] }) => {
  const [open, setOpen] = React.useState(false);

  // Analisar últimas mensagens para sugerir respostas relevantes
  const suggestedReplies = useMemo(() => {
    if (!messages || messages.length === 0) {
      return allQuickReplies.slice(0, 5); // Retorna as 5 primeiras se não houver contexto
    }

    // Pegar últimas 3 mensagens do contato
    const recentMessages = messages
      .filter(m => m.sender_type !== 'user')
      .slice(-3)
      .map(m => m.content?.toLowerCase() || '')
      .join(' ');

    if (!recentMessages) {
      return allQuickReplies.slice(0, 5);
    }

    // Calcular relevância de cada resposta baseada em keywords
    const scoredReplies = allQuickReplies.map(reply => {
      const score = reply.keywords.reduce((acc, keyword) => {
        if (recentMessages.includes(keyword)) {
          return acc + 1;
        }
        return acc;
      }, 0);
      return { ...reply, score };
    });

    // Ordenar por score e pegar as top 5
    const topReplies = scoredReplies
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Se nenhuma tem score > 0, retorna as padrão
    if (topReplies[0].score === 0) {
      return allQuickReplies.slice(0, 5);
    }

    return topReplies;
  }, [messages]);

  const handleSelect = (reply) => {
    onSelectQuickReply(reply);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b">
          <h4 className="font-medium leading-none flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Respostas Rápidas
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione uma mensagem para usar.
          </p>
        </div>
        <ScrollArea className="h-72">
          <div className="p-2">
            {suggestedReplies.length > 0 && suggestedReplies[0].score > 0 && (
              <div className="mb-2 px-2 py-1 bg-primary/10 rounded-md flex items-center gap-2 text-xs text-primary">
                <Sparkles className="h-3 w-3" />
                <span>Sugestões baseadas na conversa</span>
              </div>
            )}
            {suggestedReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleSelect(reply)}
                className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors"
              >
                <p className="font-medium text-sm">{reply.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {reply.content}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default QuickReplyPopover;