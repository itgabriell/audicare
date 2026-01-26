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
  // Configuração das Colunas
  const columns = [
    { id: 'new', title: 'Novos Leads', color: 'blue' },
    { id: 'in_conversation', title: 'Em Conversa', color: 'yellow' },
    { id: 'stopped_responding', title: 'Parou de Responder', color: 'gray' }, // NOVA COLUNA
    { id: 'scheduled', title: 'Agendou', color: 'purple' },
    { id: 'likely_purchase', title: 'Provável Compra', color: 'orange' },
    { id: 'purchased', title: 'Venda Realizada', color: 'green' },
    { id: 'no_purchase', title: 'Perdido / Não Comprou', color: 'red' },
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