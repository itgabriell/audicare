import React, { useState } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';

const KanbanBoard = ({
  leads,
  onUpdateLead,
  onEditLead,
  onOpenConversation,
  onScheduleFromLead,
}) => {
  const [activeId, setActiveId] = useState(null);

  // Sensores para detectar cliques e toques
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Tem que mover 8px para começar a arrastar (evita cliques acidentais)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Configuração das Colunas
  const columns = [
    { id: 'new', title: 'Novos Leads', color: 'blue' },
    { id: 'in_conversation', title: 'Em Conversa', color: 'yellow' },
    { id: 'stopped_responding', title: 'Parou de Responder', color: 'gray' },
    { id: 'scheduled', title: 'Agendou', color: 'purple' },
    { id: 'likely_purchase', title: 'Provável Compra', color: 'orange' },
    { id: 'purchased', title: 'Venda Realizada', color: 'green' },
    { id: 'no_purchase', title: 'Perdido / Não Comprou', color: 'red' },
  ];

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    // Se soltou fora de qualquer lugar válido
    if (!over) return;

    // Se soltou no mesmo card (ordenação visual apenas, mas aqui estamos focando em mudança de status)
    if (active.id === over.id) return;

    // A lógica original usava 'droppableId' como status. 
    // No @dnd-kit, 'over.id' pode ser o ID da coluna (se arrastou para área vazia) 
    // OU o ID de outro card (se arrastou para cima de um card).

    let newStatus = over.id;

    // Verificar se o over.id é um card ou uma coluna
    // Se for um card, precisamos descobrir em qual coluna ele está
    const isColumn = columns.some(col => col.id === over.id);

    if (!isColumn) {
      // Encontrar o lead sobre o qual soltamos
      const overLead = leads.find(l => l.id === over.id);
      if (overLead) {
        newStatus = overLead.status; // Assume o status do card de destino
      } else {
        // Fallback (não deve acontecer facilmente)
        return;
      }
    }

    // Se o status mudou, atualiza
    const activeLead = leads.find(l => l.id === active.id);
    if (!activeLead) return;

    if (activeLead.status !== newStatus) {
      onUpdateLead(activeLead.id, newStatus);
    }
  };

  // Encontrar o card ativo para o Overlay
  const activeLead = activeId ? leads.find(lead => lead.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
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

      {/* Overlay para mostrar o item sendo arrastado */}
      <DragOverlay>
        {activeLead ? (
          <div className="min-w-[260px] cursor-grabbing">
            <KanbanCard lead={activeLead} onClick={() => { }} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;