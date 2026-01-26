import React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import KanbanColumn from './KanbanColumn';

const KanbanBoard = ({
  leads,
  onUpdateLead,
  onEditLead,
  onOpenConversation,
  onScheduleFromLead,
}) => {
  // --- AQUI ESTAVA O PROBLEMA ---
  // Mudamos o id de 'contact' para 'in_conversation' para bater com o Webhook
  const columns = [
    { id: 'new', title: 'Novos Leads', color: 'blue' },
    { id: 'in_conversation', title: 'Em Conversa', color: 'yellow' }, 
    { id: 'scheduled', title: 'Agendou', color: 'purple' }, // Adicionei esta pois é comum ter
    { id: 'likely_purchase', title: 'Provável Compra', color: 'orange' },
    { id: 'purchased', title: 'Venda Realizada', color: 'green' },
    { id: 'no_purchase', title: 'Perdido / Não Comprou', color: 'red' },
  ];

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (destination.droppableId !== source.droppableId) {
      onUpdateLead(draggableId, destination.droppableId);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full min-h-[500px] overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="min-w-[280px] w-[280px] flex-shrink-0">
            <KanbanColumn
              column={column}
              leads={leads.filter((lead) => lead.status === column.id)}
              onUpdateLead={onUpdateLead}
              onEditLead={onEditLead}
              onOpenConversation={onOpenConversation}
              onScheduleFromLead={onScheduleFromLead}
            />
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;