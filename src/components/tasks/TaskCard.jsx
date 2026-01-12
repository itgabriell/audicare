import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Edit, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const TaskCard = ({ task, onUpdateStatus, onEdit, onDelete }) => {
  const isDone = task.status === 'done';

  // SLA visual para prazo
  const todayISO = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  let dueBadgeClass = 'bg-muted text-muted-foreground';
  let dueLabel = '';

  if (task.due_date) {
    dueLabel = new Date(task.due_date).toLocaleDateString('pt-BR');
    if (task.status !== 'done') {
      if (task.due_date < todayISO) {
        dueBadgeClass = 'bg-red-500/10 text-red-400'; // atrasada
      } else if (task.due_date === todayISO) {
        dueBadgeClass = 'bg-yellow-500/10 text-yellow-400'; // vence hoje
      }
    }
  }

  // mapeia prioridade para uma tag simples
  const priorityLabel =
    task.priority === 'high'
      ? 'Alta'
      : task.priority === 'low'
      ? 'Baixa'
      : 'Média';

  const priorityClass =
    task.priority === 'high'
      ? 'bg-red-500/10 text-red-400'
      : task.priority === 'low'
      ? 'bg-emerald-500/10 text-emerald-400'
      : 'bg-blue-500/10 text-blue-400';

  return (
    <motion.div
      layout
      className={`bg-card rounded-lg p-4 shadow-sm border transition-opacity ${
        isDone ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={`task-${task.id}`}
          checked={isDone}
          onCheckedChange={(checked) =>
            onUpdateStatus(task.id, checked ? 'done' : 'todo')
          }
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <label
            htmlFor={`task-${task.id}`}
            className={`font-medium text-foreground block truncate ${
              isDone ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {task.title}
          </label>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 break-words">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between mt-4 pt-3 border-t">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            {/* Responsável (quando houver nome) */}
            {task.assignee_name && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[120px]">
                  {task.assignee_name}
                </span>
              </div>
            )}

            {/* Prazo */}
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] ${dueBadgeClass}`}
                >
                  {dueLabel}
                </span>
              </div>
            )}
          </div>

          {/* Prioridade */}
          {task.priority && (
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${priorityClass}`}
            >
              Prioridade {priorityLabel}
            </span>
          )}
        </div>

        <div className="flex gap-1 mt-2 sm:mt-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(task)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default TaskCard;