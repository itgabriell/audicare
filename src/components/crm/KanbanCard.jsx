import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Clock, MessageCircle, AlertCircle, PhoneOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const KanbanCard = ({ lead, index, onClick }) => {
  // Cálculo de tempo de inatividade
  // Se tiver 'last_message_at', usa. Senão, usa a data de criação.
  const lastActivity = lead.last_message_at ? new Date(lead.last_message_at) : new Date(lead.created_at);
  const hoursSinceActivity = (new Date() - lastActivity) / (1000 * 60 * 60);
  
  // Regras de Alerta Visual
  const isStoppedResponding = lead.status === 'stopped_responding';
  
  // É urgente se: Passou de 24h E NÃO está vendido/perdido/parado
  const isUrgent = hoursSinceActivity > 24 && !['purchased', 'no_purchase', 'stopped_responding'].includes(lead.status);
  
  // É alerta se: Passou de 12h E NÃO é urgente/parado
  const isWarning = hoursSinceActivity > 12 && !isUrgent && !isStoppedResponding;

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(lead)}
          className={`
            bg-card p-3 rounded-lg border shadow-sm mb-0 cursor-pointer transition-all hover:shadow-md relative overflow-hidden group
            ${isUrgent ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}
            ${isWarning ? 'border-l-4 border-l-yellow-500' : ''}
            ${isStoppedResponding ? 'opacity-75 bg-gray-50 border-gray-200 grayscale-[0.5]' : ''}
            ${snapshot.isDragging ? 'opacity-50 ring-2 ring-primary rotate-2 z-50' : ''}
          `}
        >
          {/* Cabeçalho */}
          <div className="flex justify-between items-start mb-2">
            <span className={`font-semibold text-sm truncate pr-2 ${isStoppedResponding ? 'text-muted-foreground' : ''}`}>
              {lead.name}
            </span>
            <div className="flex gap-1">
               {lead.source === 'whatsapp' && <MessageCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />}
               {/* Ícone especial se parou de responder */}
               {isStoppedResponding && <PhoneOff className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
            </div>
          </div>

          {/* Resumo da última mensagem */}
          {lead.last_message_content ? (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic">
              "{lead.last_message_content}"
            </p>
          ) : (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic opacity-50">
              Sem mensagens recentes...
            </p>
          )}

          {/* Rodapé: Tempo e Tags */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 border-t pt-2">
            <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-600 font-bold' : ''}`}>
              {isUrgent ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              <span>
                {formatDistanceToNow(lastActivity, { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            
            {/* Tag de Telefone (opcional para facilitar identificação) */}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                {lead.phone?.slice(-4)}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;