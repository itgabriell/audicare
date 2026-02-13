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
import { sortableKeyboardCoordinates, arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';

const KanbanBoard = ({
  leads,
  onUpdateLead,
  onEditLead,
  onOpenConversation,
  onScheduleFromLead,
  onDeleteLead,
  onBulkUpdate, // New prop for bulk status update
  onBulkDelete, // New prop for bulk delete
  onBulkAction, // Fixing ReferenceError
}) => {
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  // ... existing code ...

  // Inside map

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
  // Configuração Inicial das Colunas
  const initialColumns = [
    { id: 'new', title: 'Novos Leads', color: 'blue' },
    { id: 'follow_up_1', title: 'Follow-up 1 (24h)', color: 'purple' }, // New
    { id: 'follow_up_2', title: 'Follow-up 2 (3 Dias)', color: 'purple' }, // New
    { id: 'follow_up_3', title: 'Follow-up 3 (7 Dias)', color: 'purple' }, // New
    { id: 'in_conversation', title: 'Em Conversa', color: 'yellow' },
    { id: 'recovery', title: 'Recuperar (Antigo)', color: 'gray' }, // Kept for legacy/manual? Or rename? User said "ao final da estrutura que já temos". actually user said "check/create 3 new columns... at the end of the structure we already have" but logically they fit before "conversation" or after?
    // User said: "Status Destino Obrigatório: 'Em Conversa' (Para onde o lead vai IMEDIATAMENTE se responder)."
    // Usually funnel is: New -> Follow-ups -> Conversation (if replied) OR Lost (if not).
    // Let's place them logically after 'New' and before 'In Conversation' or 'Recovery'.
    // Actually, user said "ao final da estrutura" as "add to the list".
    // But for a Kanban, logical order is better.
    // "Quebra de Barreira" -> "Escassez" -> "Encerramento".

    // Revised Order based on "Funnel":
    // 1. New
    // 2. Follow-up 1
    // 3. Follow-up 2
    // 4. Follow-up 3
    // 5. In Conversation (Successful reply)
    // 6. Scheduled
    // 7. Won
    // 8. Lost

    // I will try to respect the user's specific column names and IDs.

    // { id: 'recovery', title: 'Recuperar', color: 'red' }, // Keeping this as "Legacy/Manual Recovery" for now, or maybe the user meant "Recuperar" is the generic term.
    // The user didn't explicitly say "DELETE Recovery".
    // I will place the new columns after "Novos Leads".

    { id: 'follow_up_sent', title: 'Receberam Follow Up (Legacy)', color: 'gray' }, // Renaming/Deprecating?

    { id: 'stopped_responding', title: 'Parou de Responder', color: 'gray' },
    { id: 'scheduled', title: 'Agendou', color: 'green' },
    { id: 'purchased', title: 'Venda Realizada', color: 'emerald' },
    { id: 'completed', title: 'Concluído', color: 'slate' },
    { id: 'no_purchase', title: 'Perdido / Não Comprou', color: 'rose' },
  ];

  const [columns, setColumns] = useState(initialColumns);

  // Selection Handlers
  const toggleSelectLead = (leadId) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const cleanSelection = () => setSelectedLeads(new Set());

  const toggleSelectColumn = (columnId, columnLeads) => {
    const newSelected = new Set(selectedLeads);
    const leadIds = columnLeads.map(l => l.id);

    // Check if all are currently selected
    const allSelected = leadIds.every(id => newSelected.has(id));

    if (allSelected) {
      // Deselect all
      leadIds.forEach(id => newSelected.delete(id));
    } else {
      // Select all
      leadIds.forEach(id => newSelected.add(id));
    }
    setSelectedLeads(newSelected);
  };

  const handleBulkMove = (targetStatus) => {
    if (onBulkUpdate && selectedLeads.size > 0) {
      onBulkUpdate(Array.from(selectedLeads), targetStatus);
      cleanSelection();
    }
  };

  const handleBulkDeleteAction = () => {
    if (onBulkDelete && selectedLeads.size > 0) {
      if (window.confirm(`Tem certeza que deseja excluir ${selectedLeads.size} leads?`)) {
        onBulkDelete(Array.from(selectedLeads));
        cleanSelection();
      }
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    // Se soltou fora de qualquer lugar válido
    if (!over) return;

    // Handling Column Reordering
    if (active.data.current?.type === 'Column') {
      if (active.id !== over.id) {
        setColumns((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
      return;
    }

    // Handling Card Reordering/Moving
    // Se soltou no mesmo card (ordenação visual apenas, mas aqui estamos focando em mudança de status)
    if (active.id === over.id) return;

    let newStatus = over.id;

    // Verificar se o over.id é um card ou uma coluna
    const isColumn = columns.some(col => col.id === over.id);

    if (!isColumn) {
      // Encontrar o lead sobre o qual soltamos para descobrir a coluna
      const overLead = leads.find(l => l.id === over.id);
      if (overLead) {
        newStatus = overLead.status;
      } else {
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

  // Wrapper component for Sortable Column
  const SortableColumnWrapper = ({ column, children }) => {
    const {
      setNodeRef,
      attributes,
      listeners,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: column.id,
      data: {
        type: 'Column',
        column,
      },
    });

    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
    };

    if (isDragging) {
      return (
        <div
          ref={setNodeRef}
          style={style}
          className="min-w-[280px] w-[280px] flex-shrink-0 h-full opacity-50 bg-muted/20 border-2 border-dashed border-primary/20 rounded-xl"
        />
      );
    }

    return (
      <div ref={setNodeRef} style={style} className="min-w-[280px] w-[280px] flex-shrink-0 h-full">
        {/* Pass listeners to children or cloneElement? Better: cloneElement or render prop if complex. 
             Actually we can just pass the dragHandleProps to the child KanbanColumn.
         */}
        {React.cloneElement(children, { dragHandleProps: { ...attributes, ...listeners } })}
      </div>
    );
  };

  const activeColumn = activeId ? columns.find(c => c.id === activeId) : null;

  // Encontrar o card ativo para o Overlay
  const activeLead = activeId ? leads.find(lead => lead.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Bulk Actions Header */}
        {selectedLeads.size > 0 && (
          <div className="bg-primary/10 border-b border-primary/20 p-2 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-primary ml-2">
                {selectedLeads.size} selecionado(s)
              </span>
              <button
                onClick={cleanSelection}
                className="text-xs text-muted-foreground hover:text-primary underline"
              >
                Limpar
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="text-xs p-1 rounded border bg-background"
                onChange={(e) => e.target.value && handleBulkMove(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Mover para...</option>
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
              <button
                onClick={handleBulkDeleteAction}
                className="text-xs px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 h-full overflow-x-auto pb-4 pt-2 px-2">
          <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => (
              <SortableColumnWrapper key={column.id} column={column}>
                <KanbanColumn
                  column={column}
                  leads={leads.filter((lead) => lead.status === column.id)}
                  onUpdateLead={onUpdateLead}
                  onEditLead={onEditLead}
                  onOpenConversation={onOpenConversation}
                  onScheduleFromLead={onScheduleFromLead}
                  onDeleteLead={onDeleteLead}
                  onBulkAction={onBulkAction}
                  selectedLeads={selectedLeads}
                  toggleSelectLead={toggleSelectLead}
                  toggleSelectColumn={toggleSelectColumn}
                />
              </SortableColumnWrapper>
            ))}
          </SortableContext>
        </div>
      </div>

      {/* Overlay para mostrar o item sendo arrastado */}
      <DragOverlay>
        {activeLead && (
          <div className="min-w-[260px] cursor-grabbing opacity-80 rotate-2">
            <KanbanCard
              lead={activeLead}
              onClick={() => { }}
              selectedLeads={selectedLeads}
            />
          </div>
        )}
        {activeColumn && (
          <div className="min-w-[280px] w-[280px] h-full opacity-80 rotate-1">
            {/* Render a static version of the column for overlay */}
            <div className={`p-3 border rounded-xl bg-background shadow-xl h-[200px] flex flex-col`}>
              <div className="font-bold p-2 border-b">{activeColumn.title}</div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;