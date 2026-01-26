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
  const columns = [
    { id: 'new', title: 'Novos Leads', color: 'blue' },
    { id: 'contact', title: 'Em Contato', color: 'yellow' },
    { id: 'likely_purchase', title: 'Provável Compra', color: 'orange' },
    { id: 'purchased', title: 'Comprou', color: 'green' },
    { id: 'no_purchase', title: 'Não Comprou', color: 'red' },
  ];

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    // Se soltou fora de uma coluna válida, não faz nada
    if (!destination) return;

    // Se soltou no mesmo lugar, não faz nada
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Se mudou de coluna, chama a função de atualização
    if (destination.droppableId !== source.droppableId) {
      onUpdateLead(draggableId, destination.droppableId);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 h-full min-h-[500px]">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            leads={leads.filter((lead) => lead.status === column.id)}
            onUpdateLead={onUpdateLead}
            onEditLead={onEditLead}
            onOpenConversation={onOpenConversation}
            onScheduleFromLead={onScheduleFromLead}
          />
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;