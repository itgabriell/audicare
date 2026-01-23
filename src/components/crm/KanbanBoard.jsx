import React from 'react';
import KanbanColumn from './KanbanColumn';

const KanbanBoard = ({
  leads,
  onUpdateLead,
  onEditLead,
  onOpenConversation,
  onScheduleFromLead,
}) => {
  // CONFIGURAÇÃO DAS NOVAS ETAPAS
  const columns = [
    { id: 'new', title: 'Novos Leads', color: 'blue' },
    { id: 'in_conversation', title: 'Em Conversa', color: 'yellow' },
    { id: 'scheduled', title: 'Agendou', color: 'orange' },
    { id: 'arrived', title: 'Compareceu', color: 'green' },
    { id: 'no_show', title: 'Não Compareceu', color: 'red' },
    { id: 'stopped_responding', title: 'Parou de Responder', color: 'red' },
    { id: 'purchased', title: 'Comprou', color: 'green' },
    { id: 'no_purchase', title: 'Não Comprou', color: 'red' },
  ];

  return (
    // Adicionei overflow-x-auto para permitir rolagem horizontal se tiver muitas colunas
    <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
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
  );
};

export default KanbanBoard;