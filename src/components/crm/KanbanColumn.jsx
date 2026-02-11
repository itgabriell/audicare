import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

const KanbanColumn = ({
  column,
  leads,
  onEditLead,
  onOpenConversation,
  onScheduleFromLead,
  onBulkAction,
  onUpdateLead, // NEW
  onDeleteLead, // NEW
}) => {
  // Config Droppable para a coluna (para receber itens quando vazia ou entre itens)
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
    purple: 'bg-slate-500/10 border-slate-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20',
    green: 'bg-green-500/10 border-green-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    gray: 'bg-gray-500/10 border-gray-500/20', // Estilo para 'Parou de Responder'
  };

  const headerColorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-slate-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500', // Header para 'Parou de Responder'
  };

  // IDs para o SortableContext (necessário para o dnd-kit saber a ordem)
  const leadIds = leads.map(l => l.id);

  return (
    <div
      className={`rounded-xl border ${colorClasses[column.color]} flex flex-col h-full max-h-full`}
    >
      {/* Cabeçalho da Coluna */}
      <div className="p-3 border-b border-border bg-background/50 rounded-t-xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${headerColorClasses[column.color]}`}
            />
            <h3 className="font-semibold text-foreground text-sm">{column.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* BULK ACTION BUTTON (Only for Recovery for now) */}
            {column.id === 'recovery' && leads.length > 0 && (
              <button
                onClick={() => onBulkAction && onBulkAction(leads)}
                className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full hover:bg-red-200 transition-colors font-medium"
                title="Disparar recuperação em massa"
              >
                Disparar ({leads.length})
              </button>
            )}

            <span className="text-xs text-muted-foreground bg-background/80 rounded-full px-2 py-0.5 border shadow-sm">
              {leads.length}
            </span>
          </div>
        </div>
      </div>

      {/* Área onde os cards caem (Droppable + Sortable) */}
      <div
        ref={setNodeRef}
        className={`
          p-2 space-y-2 overflow-y-auto flex-1 transition-colors scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700
          ${isOver ? 'bg-muted/30' : ''}
        `}
        style={{ minHeight: '100px' }}
      >
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              onClick={onEditLead}
              onUpdateLead={onUpdateLead}
              onDeleteLead={onDeleteLead}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export default KanbanColumn;