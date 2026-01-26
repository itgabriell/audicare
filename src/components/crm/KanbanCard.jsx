import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, MessageCircle, Clock, AlertCircle } from 'lucide-react';

const KanbanCard = ({ lead, index, onClick }) => {
  
  // --- LÓGICA DO RADAR ANTI-LIMBO ---
  const getCardStatus = () => {
    if (!lead.last_message_at) return { color: 'border-l-4 border-l-gray-300', alert: null };

    const lastMsgDate = new Date(lead.last_message_at);
    const hoursSince = differenceInHours(new Date(), lastMsgDate);
    const isIncoming = lead.last_message_type === 'incoming';

    // 1. CRÍTICO: Cliente falou e está esperando há mais de 4 horas
    if (isIncoming && hoursSince >= 4) {
        return { 
            color: 'border-l-4 border-l-red-500 bg-red-50/50', 
            alert: { text: 'Esperando +4h', color: 'text-red-600 bg-red-100', icon: AlertCircle }
        };
    }

    // 2. ATENÇÃO: Cliente acabou de falar (menos de 4h) -> Precisa responder logo
    if (isIncoming) {
        return { 
            color: 'border-l-4 border-l-green-500', 
            alert: { text: 'Responder', color: 'text-green-700 bg-green-100', icon: MessageCircle }
        };
    }

    // 3. LIMBO: Nós falamos, mas cliente não responde há mais de 3 dias (72h)
    if (!isIncoming && hoursSince >= 72) {
        return { 
            color: 'border-l-4 border-l-yellow-500', 
            alert: { text: 'Fazer Follow-up', color: 'text-yellow-700 bg-yellow-100', icon: Clock }
        };
    }

    // 4. NORMAL: Conversa fluindo ou finalizada recentemente
    return { color: 'border-l-4 border-l-transparent hover:border-l-primary/50', alert: null };
  };

  const { color, alert } = getCardStatus();

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{ ...provided.draggableProps.style }}
          className="mb-3"
          onClick={() => onClick(lead)}
        >
          <Card 
            className={`
              cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 
              ${color} ${snapshot.isDragging ? 'opacity-75 rotate-2 scale-105' : ''}
            `}
          >
            <CardContent className="p-3 space-y-2.5">
              
              {/* Header: Nome e Tempo */}
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-sm text-foreground truncate pr-2" title={lead.name}>
                  {lead.name}
                </h4>
                {lead.last_message_at && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {formatDistanceToNow(new Date(lead.last_message_at), { locale: ptBR, addSuffix: true })}
                  </span>
                )}
              </div>

              {/* Badges e Alertas */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {/* Badge de Fonte (Instagram, Google, etc) */}
                {lead.source && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                        {lead.source}
                    </Badge>
                )}

                {/* ALERTA DO RADAR */}
                {alert && (
                    <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${alert.color}`}>
                        <alert.icon className="w-3 h-3" />
                        {alert.text}
                    </div>
                )}
              </div>

              {/* Última Mensagem (Preview) */}
              {lead.last_message_content && (
                <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/30 p-1.5 rounded-md">
                  {lead.last_message_content}
                </div>
              )}

              {/* Rodapé: Telefone */}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                <Phone className="w-3 h-3" />
                <span>{lead.phone}</span>
              </div>

            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;