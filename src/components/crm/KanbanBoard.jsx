import React from 'react';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
  );
};

export default KanbanBoard;