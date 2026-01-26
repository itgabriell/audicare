import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import KanbanCard from './KanbanCard';

const KanbanColumn = ({
  column,
  leads,
  onEditLead,
  onOpenConversation,
  onScheduleFromLead,
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20',
    green: 'bg-green-500/10 border-green-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    gray: 'bg-gray-500/10 border-gray-500/20', // Estilo para 'Parou de Responder'
  };

  const headerColorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500', // Header para 'Parou de Responder'
  };

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
          <span className="text-xs text-muted-foreground bg-background/80 rounded-full px-2 py-0.5 border shadow-sm">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Área onde os cards caem (Droppable) */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              p-2 space-y-2 overflow-y-auto flex-1 transition-colors scrollbar-thin scrollbar-thumb-gray-200
              ${snapshot.isDraggingOver ? 'bg-muted/30' : ''}
            `}
            style={{ minHeight: '100px' }} 
          >
            {leads.map((lead, index) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                index={index}
                onClick={onEditLead}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;