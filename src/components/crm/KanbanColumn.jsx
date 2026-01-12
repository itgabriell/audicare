import React from 'react';
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
    orange: 'bg-orange-500/10 border-orange-500/20',
    green: 'bg-green-500/10 border-green-500/20',
    red: 'bg-red-500/10 border-red-500/20',
  };

  const headerColorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
  };

  return (
    <div
      className={`rounded-xl border ${colorClasses[column.color]} flex flex-col`}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${headerColorClasses[column.color]}`}
            />
            <h3 className="font-semibold text-foreground">{column.title}</h3>
          </div>
          <span className="text-sm text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {leads.length}
          </span>
        </div>
      </div>

      <div className="p-2 space-y-2 overflow-y-auto flex-1">
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onEditLead={onEditLead}
            onOpenConversation={onOpenConversation}
            onScheduleFromLead={onScheduleFromLead}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;