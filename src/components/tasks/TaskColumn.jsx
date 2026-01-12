import React from 'react';
import TaskCard from './TaskCard';

const TaskColumn = ({ column, tasks, onUpdateTask, onEditTask, onDeleteTask }) => {
  return (
    <div className="bg-muted/50 rounded-xl p-4 min-h-[400px]">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="font-semibold text-foreground">{column.title}</h3>
        <span className="text-sm text-muted-foreground bg-muted rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <div className="space-y-3">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdateStatus={onUpdateTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskColumn;