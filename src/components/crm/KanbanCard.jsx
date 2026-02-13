import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MessageCircle, AlertCircle, PhoneOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";

const KanbanCard = ({ lead, onClick, onUpdateLead, onDeleteLead, selectedLeads, toggleSelectLead }) => {
  const isSelected = selectedLeads?.has(lead.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Cálculo de tempo de inatividade
  const lastActivity = lead.last_message_at ? new Date(lead.last_message_at) : new Date(lead.created_at);
  const hoursSinceActivity = (new Date() - lastActivity) / (1000 * 60 * 60);

  // Regras de Alerta Visual
  const isStoppedResponding = lead.status === 'stopped_responding';

  // É urgente se: Passou de 24h E NÃO está vendido/perdido/parado
  const isUrgent = hoursSinceActivity > 24 && !['purchased', 'no_purchase', 'stopped_responding'].includes(lead.status);

  // É alerta se: Passou de 12h E NÃO é urgente/parado
  const isWarning = hoursSinceActivity > 12 && !isUrgent && !isStoppedResponding;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={() => onClick(lead)}
          className={`
            bg-card p-3 rounded-lg border shadow-sm mb-0 cursor-pointer transition-all hover:shadow-md relative overflow-hidden group touch-none
            ${isUrgent ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}
            ${isWarning ? 'border-l-4 border-l-yellow-500' : ''}
            ${isStoppedResponding ? 'opacity-75 bg-gray-50 border-gray-200 grayscale-[0.5] dark:bg-slate-800/50 dark:border-slate-700' : ''}
            ${isDragging ? 'opacity-50 ring-2 ring-primary rotate-2 z-50 shadow-xl scale-105' : ''}
            ${isSelected ? 'ring-2 ring-primary ring-offset-1 bg-primary/5' : ''}
          `}
        >
          {/* Selection Checkbox (Visible on hover or when selected) */}
          <div
            className={`
              absolute top-2 left-2 z-10 
              ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
              transition-opacity
            `}
            onClick={(e) => {
              e.stopPropagation();
              toggleSelectLead && toggleSelectLead(lead.id);
            }}
          >
            <div className={`
               w-5 h-5 rounded border border-primary/50 flex items-center justify-center
               ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-primary/10'}
             `}>
              {isSelected && <div className="w-3 h-3 bg-white rounded-sm" />}
            </div>
          </div>
          {/* Cabeçalho */}
          <div className="flex justify-between items-start mb-2 pl-4">
            <span className={`font-semibold text-sm truncate pr-2 ${isStoppedResponding ? 'text-muted-foreground' : ''}`}>
              {lead.name}
            </span>
            <div className="flex gap-1 items-center">
              {lead.phone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navegar para integração
                    const params = new URLSearchParams();
                    const cleanPhone = (lead.phone || '').replace(/\D/g, '');
                    params.append('phone', cleanPhone);
                    params.append('name', lead.name || 'Visitante');
                    if (lead.email) params.append('email', lead.email);
                    if (lead.id) params.append('leadId', lead.id);

                    window.location.href = `/inbox?${params.toString()}`;
                  }}
                  className="p-1 hover:bg-green-100 rounded-full text-green-600 transition-colors"
                  title="Abrir WhatsApp/Chat"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              )}
              {isStoppedResponding && <PhoneOff className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
            </div>
          </div>

          {/* Resumo da última mensagem */}
          {lead.last_message_content ? (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic">
              &quot;{lead.last_message_content}&quot;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic opacity-50">
              Sem mensagens recentes...
            </p>
          )}

          {/* Rodapé: Tempo e Tags */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">

            {/* Badge de Urgência */}
            <div className={`
              flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
              ${isUrgent
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                : isWarning
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }
            `}>
              {isUrgent ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              <span>
                {Math.floor(hoursSinceActivity) === 0 ? 'Agora' : `${Math.floor(hoursSinceActivity)}h sem resp.`}
              </span>
            </div>

            {/* ID Removed as requested */}
            {/* <span className="text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              #{lead.id}
            </span> */}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        <ContextMenuItem inset onClick={() => onClick(lead)}>
          Editar Lead
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger inset>Mover para...</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onClick={() => onUpdateLead(lead.id, 'new')}>
              Novos Leads
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onUpdateLead(lead.id, 'in_conversation')}>
              Em Conversa
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onUpdateLead(lead.id, 'recovery')}>
              Recuperar
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onUpdateLead(lead.id, 'scheduled')}>
              Agendou
            </ContextMenuItem>
            {/* <ContextMenuItem onClick={() => onUpdateLead(lead.id, 'likely_purchase')}>
              Provável Compra
            </ContextMenuItem> */}
            <ContextMenuItem onClick={() => onUpdateLead(lead.id, 'purchased')}>
              Venda Realizada
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onUpdateLead(lead.id, 'completed')}>
              Concluído
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onUpdateLead(lead.id, 'stopped_responding')}>
              Parou de Responder
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onUpdateLead(lead.id, 'no_purchase')}>
              Perdido / Não Comprou
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem inset className="text-red-600 focus:text-red-500" onClick={() => onDeleteLead && onDeleteLead(lead.id)}>
          Arquivar / Excluir
        </ContextMenuItem>

      </ContextMenuContent>
    </ContextMenu>
  );
};

export default KanbanCard;