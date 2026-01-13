import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const DraggableTask = ({ task, onTaskClick, onTaskEdit, onTaskDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Normal';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-card border rounded-lg p-3 mb-3 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
      onClick={() => onTaskClick(task)}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          {...listeners}
          className="h-4 w-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate mb-2">
            {task.title}
          </h4>

          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task.priority && (
                <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </Badge>
              )}

              {task.due_date && (
                <span className="text-xs text-muted-foreground">
                  {new Date(task.due_date).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTaskEdit(task)}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onTaskDelete(task)}
                  className="text-destructive"
                >
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

const DroppableColumn = ({
  id,
  title,
  tasks,
  color,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onAddTask
}) => {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id,
    data: {
      type: 'column',
      columnId: id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-muted/30 rounded-lg p-4 min-h-[400px] transition-colors ${
        isOver ? 'bg-primary/5 border-2 border-primary/30 border-dashed' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <h3 className="font-semibold text-foreground">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddTask}
          className="h-6 w-6 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <SortableContext
        items={tasks.map(task => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {tasks.map(task => (
            <DraggableTask
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
              onTaskEdit={onTaskEdit}
              onTaskDelete={onTaskDelete}
            />
          ))}
        </div>
      </SortableContext>

      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
            <Plus className="h-5 w-5" />
          </div>
          <p className="text-sm text-center">Nenhuma tarefa</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTask}
            className="mt-2 text-xs"
          >
            Adicionar primeira tarefa
          </Button>
        </div>
      )}
    </div>
  );
};

const DraggableKanbanBoard = ({
  tasks,
  onTaskMove,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onAddTask
}) => {
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped = {
      todo: [],
      doing: [],
      done: []
    };

    tasks.forEach(task => {
      const status = task.status || 'todo';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped.todo.push(task); // fallback
      }
    });

    return grouped;
  }, [tasks]);

  const columns = [
    {
      id: 'todo',
      title: 'A Fazer',
      color: 'bg-gray-400',
      tasks: tasksByStatus.todo
    },
    {
      id: 'doing',
      title: 'Em Andamento',
      color: 'bg-blue-400',
      tasks: tasksByStatus.doing
    },
    {
      id: 'done',
      title: 'Concluído',
      color: 'bg-green-400',
      tasks: tasksByStatus.done
    }
  ];

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    setActiveId(null);
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find(task => task.id === active.id);
    if (!activeTask) return;

    // Determine target column
    let targetStatus = over.data.current?.columnId;

    // If dropped on a task, get that task's status
    if (over.data.current?.type === 'task') {
      const targetTask = tasks.find(task => task.id === over.id);
      targetStatus = targetTask?.status;
    }

    if (!targetStatus || targetStatus === activeTask.status) return;

    // Move task to new status
    if (onTaskMove) {
      onTaskMove(activeTask, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(column => (
          <DroppableColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            tasks={column.tasks}
            onTaskClick={onTaskClick}
            onTaskEdit={onTaskEdit}
            onTaskDelete={onTaskDelete}
            onAddTask={() => onAddTask(column.id)}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="bg-card border rounded-lg p-3 shadow-lg rotate-3 max-w-sm">
            <h4 className="font-medium text-foreground truncate mb-1">
              {activeTask.title}
            </h4>
            {activeTask.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {activeTask.description}
              </p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DraggableKanbanBoard;
